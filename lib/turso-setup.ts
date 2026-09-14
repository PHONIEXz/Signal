import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Client } from "@libsql/client";

export function hashSchema(source: string) {
  return createHash("sha256").update(source.replaceAll("\r\n", "\n")).digest("hex");
}

export function bootstrapSql() {
  const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  const manifest = JSON.parse(readFileSync(new URL("../prisma/turso/bootstrap.json", import.meta.url), "utf8"));
  if (hashSchema(schema) !== manifest.schemaSha256) {
    throw new Error("The Prisma schema changed. Prepare a reviewed Turso migration before using this setup script.");
  }
  return readFileSync(new URL("../prisma/turso/bootstrap.sql", import.meta.url), "utf8");
}

export async function checkTursoSchema(client: Pick<Client, "execute">, sql: string) {
  const tables = [...sql.matchAll(/CREATE TABLE "(\w+)" \(([\s\S]*?)\n\);/g)];
  if (!tables.length) throw new Error("No tables found in the bootstrap schema.");
  for (const [, name, definition] of tables) {
    const expected = [...definition.matchAll(/^\s+"(\w+)"/gm)].map((match) => match[1]);
    const actual = await client.execute('PRAGMA table_info("' + name + '")');
    const names = new Set(actual.rows.map((row) => String(row.name)));
    if (expected.some((column) => !names.has(column))) {
      throw new Error("Signal tables are missing or outdated. Run setup only for an empty database; existing databases need a reviewed migration.");
    }
  }
  const expectedIndexes = [...sql.matchAll(/CREATE (?:UNIQUE )?INDEX "(\w+)"/g)].map((match) => match[1]);
  const indexes = await client.execute("SELECT name FROM sqlite_master WHERE type = 'index'");
  const names = new Set(indexes.rows.map((row) => String(row.name)));
  if (expectedIndexes.some((name) => !names.has(name))) throw new Error("Signal database indexes are incomplete.");
  const integrity = await client.execute("PRAGMA foreign_key_check");
  if (integrity.rows.length) throw new Error("Database relationship checks failed; no data was modified.");
  return tables.length;
}

export async function initializeEmptyTurso(client: Client, sql: string) {
  const tx = await client.transaction("write");
  try {
    const result = await tx.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
    const tables = result.rows.map((row) => String(row.name));
    if (tables.includes("_SignalBootstrap")) {
      const marker = await tx.execute("SELECT hash FROM _SignalBootstrap WHERE id = 1");
      if (marker.rows[0]?.hash !== hashSchema(sql)) throw new Error("This database has a different schema baseline. It needs a reviewed migration.");
      await tx.rollback();
      await checkTursoSchema(client, sql);
      return "already-ready";
    }
    if (tables.length) throw new Error("Setup stopped: this database already contains tables. Nothing was overwritten.");
    // This baseline contains CREATE statements only, not historical table rewrites.
    await tx.executeMultiple(sql);
    await tx.execute("CREATE TABLE _SignalBootstrap (id INTEGER PRIMARY KEY, hash TEXT NOT NULL)");
    await tx.execute({ sql: "INSERT INTO _SignalBootstrap (id, hash) VALUES (1, ?)", args: [hashSchema(sql)] });
    await tx.commit();
    return "created";
  } catch (error) {
    if (!tx.closed) await tx.rollback();
    throw error;
  } finally { tx.close(); }
}
