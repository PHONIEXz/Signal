import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { createClient } from "@libsql/client";
import { bootstrapSql, initializeEmptyTurso, checkTursoSchema } from "./turso-setup.ts";
import { upgradeMetrics } from "./turso-metrics-upgrade.ts";

const previous = readFileSync(new URL("../prisma/turso/pre-metrics.sql", import.meta.url), "utf8");
const migration = readFileSync(new URL("../prisma/migrations/20260916000000_metric_history/migration.sql", import.meta.url), "utf8");

test("upgrade preserves post content and archives ambiguous counters, then safely repeats", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    await initializeEmptyTurso(client, previous);
    await client.execute("INSERT INTO User(id,email) VALUES ('u','migration@example.com')");
    await client.execute("INSERT INTO ConnectedAccount(id,userId,platform,accessToken,updatedAt) VALUES ('a','u','x','test-only','2026-09-01')");
    await client.execute("INSERT INTO Post(id,connectedAccountId,platformPostId,text,tags,likeCount,viewCount,fetchedAt) VALUES ('p','a','42','Preserved text','campaign',0,12,'2026-09-01')");
    await client.execute("INSERT INTO MetricSnapshot(id,connectedAccountId,followersCount,totalLikes) VALUES ('s','a',55,0)");
    await upgradeMetrics(client, previous, bootstrapSql(), migration);
    assert.equal(await checkTursoSchema(client, bootstrapSql()), 15);
    const post = (await client.execute("SELECT * FROM Post WHERE id='p'")).rows[0];
    assert.equal(post.text, "Preserved text"); assert.equal(post.tags, "campaign"); assert.equal(post.likeCount, null);
    const history = (await client.execute("SELECT * FROM PostMeasurement WHERE postId='p'")).rows[0];
    assert.equal(history.source, "LEGACY"); assert.equal(JSON.parse(String(history.rawLegacy)).viewCount, 12);
    assert.equal((await client.execute("SELECT postMetricsStatus FROM MetricSnapshot")).rows[0].postMetricsStatus, "LEGACY");
    await client.execute("UPDATE Post SET likeCount=7 WHERE id='p'");
    await upgradeMetrics(client, previous, bootstrapSql(), migration);
    assert.equal((await client.execute("SELECT likeCount FROM Post")).rows[0].likeCount, 7);
    assert.equal((await client.execute("PRAGMA foreign_key_check")).rows.length, 0);
    await client.execute("DELETE FROM ConnectedAccount WHERE id='a'");
    assert.equal((await client.execute("SELECT * FROM PostMeasurement")).rows.length, 0);
  } finally { client.close(); }
});

test("failed upgrade rolls back and unfamiliar Post relationships stop the upgrade", async () => {
  const client = createClient({ url: ":memory:" });
  try {
    await initializeEmptyTurso(client, previous);
    await assert.rejects(upgradeMetrics(client, previous, bootstrapSql(), migration + " INVALID SQL;"));
    assert.equal(await checkTursoSchema(client, previous), 12);
    assert.equal((await client.execute("SELECT name FROM sqlite_master WHERE name='MetricSync'")).rows.length, 0);
    await client.execute("CREATE TABLE Extra(postId TEXT REFERENCES Post(id))");
    await assert.rejects(upgradeMetrics(client, previous, bootstrapSql(), migration), /Unexpected Post/);
    await client.execute("DROP TABLE Extra");
    await client.execute("UPDATE _SignalBootstrap SET hash='unrecognized'");
    await assert.rejects(upgradeMetrics(client, previous, bootstrapSql(), migration), /Unknown schema/);
  } finally { client.close(); }
});

test("Prisma storage keeps measurements, enforces leases and preserves newer API values on older imports", async () => {
  const folder = mkdtempSync(join(tmpdir(), "signal-metric-storage-"));
  process.env.DATABASE_PROVIDER = "sqlite";
  process.env.DATABASE_URL = "file:" + join(folder, "test.db");
  delete process.env.VERCEL;
  const Database = createRequire(import.meta.url)("better-sqlite3");
  const db = new Database(join(folder, "test.db"));
  const migrations = new URL("../prisma/migrations/", import.meta.url);
  for (const name of readdirSync(migrations).sort()) if (name !== "migration_lock.toml") db.exec(readFileSync(new URL(name + "/migration.sql", migrations), "utf8"));
  db.close();
  const { prisma } = await import("./prisma.ts");
  const { claimMetricSync, storeCollection, finishMetricFailure, metricsSchemaReady } = await import("./metric-storage.ts");
  const { attachMeasurementEvidence } = await import("./measurement-evidence.ts");
  try {
    assert.equal(await metricsSchemaReady(), true);
    const user = await prisma.user.create({ data: { email: "storage@example.com" } });
    const account = await prisma.connectedAccount.create({ data: { userId: user.id, platform: "x", accessToken: "test-only" } });
    const lockId = await claimMetricSync(account.id, user.id, "FREE", 10); assert.ok(lockId);
    assert.equal(await claimMetricSync(account.id, user.id, "FREE", 10), null);
    const post = { id: "42", text: "API content", url: "https://x.com/i/web/status/42", postedAt: new Date(), likeCount: 0, viewCount: null, replyCount: 2, retweetCount: 0, quoteCount: 0 };
    const input = { accountId: account.id, lockId, platform: "x", posts: [post], requested: 10, complete: true, warning: null, source: "API" as const, accountMetrics: { followers: 55, following: null, totalPosts: 100 } };
    await storeCollection(input);
    const saved = await prisma.post.findFirstOrThrow();
    assert.equal(saved.likeCount, 0); assert.equal(saved.viewCount, null); assert.equal(saved.permalinkUrl, post.url);
    const snapshot = await prisma.metricSnapshot.findFirstOrThrow();
    assert.equal(snapshot.totalViews, null); assert.equal(snapshot.totalLikes, 0); assert.equal(snapshot.postMetricsStatus, "PARTIAL");
    assert.equal(await claimMetricSync(account.id, user.id, "FREE", 10), null);
    await assert.rejects(storeCollection(input), /lease expired/);
    await prisma.post.update({ where: { id: saved.id }, data: { tags: "preserve" } });
    await prisma.metricSync.update({ where: { connectedAccountId: account.id }, data: { nextAllowedAt: null } });
    const csvLock = await claimMetricSync(account.id, user.id, "FREE", 10); assert.ok(csvLock);
    await storeCollection({ ...input, lockId: csvLock, source: "CSV", capturedAt: new Date(Date.now()-86400000), posts: [{ ...post, text: "Old CSV", likeCount: 999 }] });
    assert.equal(await prisma.postMeasurement.count(), 2); assert.equal(await prisma.metricSnapshot.count(), 1);
    const preserved = await prisma.post.findFirstOrThrow(); assert.equal(preserved.text, "API content"); assert.equal(preserved.likeCount, 0); assert.equal(preserved.tags, "preserve");
    const evidence = await attachMeasurementEvidence([preserved]);
    assert.deepEqual(evidence[0].measurements.map(m=>m.source), ["API", "CSV"]);
    const successAt = (await prisma.metricSync.findUniqueOrThrow({ where: { connectedAccountId: account.id } })).lastSuccessAt;
    await prisma.metricSync.update({ where: { connectedAccountId: account.id }, data: { nextAllowedAt: null } });
    const failed = await claimMetricSync(account.id, user.id, "FREE", 10); assert.ok(failed);
    await finishMetricFailure(account.id, failed, "Test timeout");
    assert.equal((await prisma.metricSync.findUniqueOrThrow({ where: { connectedAccountId: account.id } })).lastSuccessAt?.getTime(), successAt?.getTime());
    assert.equal(await prisma.postMeasurement.count(), 2);
    const key = `metrics:${user.id}:${new Date().toISOString().slice(0,10)}`;
    await prisma.authRateLimit.update({ where: { key }, data: { count: 12 } });
    await prisma.metricSync.update({ where: { connectedAccountId: account.id }, data: { nextAllowedAt: null } });
    assert.equal(await claimMetricSync(account.id, user.id, "FREE", 10), null);
    assert.equal((await prisma.metricSync.findUniqueOrThrow({ where: { connectedAccountId: account.id } })).status, "LIMITED");
  } finally { await prisma.$disconnect(); rmSync(folder, { recursive: true, force: true }); }
});
