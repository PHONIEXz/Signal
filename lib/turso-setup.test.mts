import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma/client.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrapSql, checkTursoSchema, initializeEmptyTurso } from "./turso-setup.ts";
import { databaseConfig } from "./database-config.ts";

test("Turso credentials alone do not change local mode; Vercel cannot use a local file", () => {
  const credentials = { TURSO_DATABASE_URL: "libsql://signal.example", TURSO_AUTH_TOKEN: "test-only" };
  assert.equal(databaseConfig(credentials).provider, "sqlite");
  assert.equal(databaseConfig({ ...credentials, DATABASE_PROVIDER: "turso" }).provider, "turso");
  assert.equal(databaseConfig({ ...credentials, VERCEL: "1" }).provider, "turso");
  assert.throws(() => databaseConfig({ VERCEL: "1", DATABASE_PROVIDER: "sqlite" }));
  assert.throws(() => databaseConfig({ VERCEL: "1" }));
  assert.throws(() => databaseConfig({ DATABASE_PROVIDER: "postgres" }));
  assert.throws(() => databaseConfig({ ...credentials, DATABASE_PROVIDER: "turso", TURSO_DATABASE_URL: "http://signal.example" }));
});

test("bootstrap creates usable Prisma libSQL tables, preserves data on repeat, and detects missing columns", async () => {
  const folder = mkdtempSync(join(tmpdir(), "signal-libsql-test-"));
  const url = "file:" + join(folder, "test.db");
  const client = createClient({ url });
  const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
  try {
    const sql = bootstrapSql();
    assert.equal(await initializeEmptyTurso(client, sql), "created");
    assert.equal(await checkTursoSchema(client, sql), 12);
    const user = await prisma.user.create({ data: { email: "libsql@example.com", hashedPassword: "test-only" } });
    const account = await prisma.connectedAccount.create({ data: { userId: user.id, platform: "x", accessToken: "test-only" } });
    await prisma.metricSnapshot.create({ data: { connectedAccountId: account.id, followersCount: 10 } });
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: "test-hash", expiresAt: new Date(Date.now() + 60000) } });
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.deleteMany({ where: { tokenHash: "test-hash", expiresAt: { gt: new Date() } } });
      assert.equal(claimed.count, 1);
      await tx.user.update({ where: { id: user.id }, data: { passwordVersion: { increment: 1 } } });
    });
    assert.equal(await initializeEmptyTurso(client, sql), "already-ready");
    assert.equal(await prisma.metricSnapshot.count(), 1);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordVersion, 1);
    await client.execute('ALTER TABLE "User" DROP COLUMN "passwordVersion"');
    await assert.rejects(checkTursoSchema(client, sql), /missing or outdated/);
  } finally { await prisma.$disconnect(); client.close(); rmSync(folder, { recursive: true, force: true }); }
});

test("setup refuses an existing database and rolls back failed initialization", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    await client.execute("CREATE TABLE Important (id INTEGER PRIMARY KEY)");
    await client.execute("INSERT INTO Important VALUES (7)");
    await assert.rejects(initializeEmptyTurso(client, bootstrapSql()), /already contains tables/);
    assert.equal((await client.execute("SELECT id FROM Important")).rows[0].id, 7);
  } finally { client.close(); }
  const empty = createClient({ url: ":memory:" });
  try {
    await assert.rejects(initializeEmptyTurso(empty, "CREATE TABLE Partial (id INTEGER); INVALID SQL;"));
    const tables = await empty.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Partial'");
    assert.equal(tables.rows.length, 0);
  } finally { empty.close(); }
});

test("publishing upgrade preserves records and is safe to repeat", async () => {
  const { upgradePublishing } = await import("./turso-publishing-upgrade.ts");
  const { readFileSync } = await import("node:fs");
  const sql = bootstrapSql();
  const old = sql.slice(0, sql.indexOf('\nCREATE TABLE "ContentPublication"')).trimEnd() + "\n";
  const migration = readFileSync(new URL("../prisma/migrations/20260915100000_content_publishing/migration.sql", import.meta.url), "utf8");
  const client = createClient({ url: ":memory:" });
  try {
    await initializeEmptyTurso(client, old);
    await client.execute(`INSERT INTO "User" (id, email) VALUES ('preserve', 'existing@example.com')`);
    await upgradePublishing(client, sql, migration); await upgradePublishing(client, sql, migration);
    assert.equal(await initializeEmptyTurso(client, sql), "already-ready");
    assert.equal(await checkTursoSchema(client, sql), 12);
    assert.equal((await client.execute('SELECT count(*) AS total FROM "User"')).rows[0].total, 1);
  } finally { client.close(); }
});
