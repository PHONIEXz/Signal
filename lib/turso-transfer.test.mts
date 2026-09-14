import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { bootstrapSql, initializeEmptyTurso } from "./turso-setup.ts";
import { transferTables, type TransferTable } from "./turso-transfer.ts";

test("copy preserves values, retries safely, refuses conflicts and rolls back late failures", async () => {
  const dir = mkdtempSync(join(tmpdir(), "signal-transfer-"));
  const source = createClient({ url: "file:" + join(dir, "source.db"), intMode: "bigint" });
  const target = createClient({ url: "file:" + join(dir, "target.db"), intMode: "bigint" });
  const broken = createClient({ url: "file:" + join(dir, "broken.db"), intMode: "bigint" });
  const sql = bootstrapSql();
  try {
    for (const client of [source,target,broken]) await initializeEmptyTurso(client, sql);
    await source.execute("INSERT INTO User (id,email,hashedPassword) VALUES ('u','private@example.test','hash')");
    await source.execute("INSERT INTO ConnectedAccount (id,userId,platform,accessToken,updatedAt) VALUES ('c','u','x','encrypted','2026-01-01T00:00:00.000Z')");
    await source.execute("INSERT INTO MetricSnapshot (id,connectedAccountId,followersCount,totalViews) VALUES ('m','c',123,9007199254740993)");
    const tables: TransferTable[] = [];
    for (const [, name, definition] of sql.matchAll(/CREATE TABLE "(\w+)" \(([\s\S]*?)\n\);/g)) {
      const columns = [...definition.matchAll(/^\s+"(\w+)"/gm)].map(m => m[1]);
      const result = await source.execute('SELECT * FROM "' + name + '"');
      tables.push({ name, columns, rows: result.rows.map(r => columns.map(c => r[c])) });
    }
    assert.equal(await transferTables(target, sql, tables), "transferred");
    assert.equal((await target.execute("SELECT totalViews FROM MetricSnapshot")).rows[0].totalViews, BigInt("9007199254740993"));
    assert.equal(await transferTables(target, sql, tables), "already-verified");
    await target.execute("UPDATE User SET name='remote change'");
    await assert.rejects(transferTables(target, sql, tables), /different data/);
    assert.equal((await target.execute("SELECT name FROM User")).rows[0].name, "remote change");
    await broken.execute("CREATE TRIGGER reject_connection BEFORE INSERT ON ConnectedAccount BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    await assert.rejects(transferTables(broken, sql, tables));
    assert.equal((await broken.execute("SELECT count(*) AS n FROM User")).rows[0].n, BigInt(0));
  } finally { source.close(); target.close(); broken.close(); rmSync(dir, { recursive: true, force: true }); }
});
