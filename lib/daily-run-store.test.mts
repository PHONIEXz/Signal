import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { startDailyRun, setDailyRunScope, recordDailyOutcome, finishDailyRun, readDailyRuns, type RunDatabase } from "./daily-run-store.ts";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
test("ledger initialization is additive, progress is durable, history survives re-initialization", async () => {
  const sqlite = new Database(":memory:");
  const db: RunDatabase = {
    $executeRawUnsafe: async (query,...values) => Number(sqlite.prepare(query).run(...values).changes),
    $queryRawUnsafe: async <T,>(query:string,...values:unknown[]) => sqlite.prepare(query).all(...values) as T,
  };
  try {
    sqlite.exec("CREATE TABLE Existing (value TEXT); INSERT INTO Existing VALUES ('preserve')");
    assert.deepEqual(await readDailyRuns(db),[]);
    const id = await startDailyRun(db,"scheduler",new Date("2026-10-19T06:05:00Z"));
    await setDailyRunScope(db,id,4,true);
    await Promise.all([recordDailyOutcome(db,id,"collected"),recordDailyOutcome(db,id,"skipped"),recordDailyOutcome(db,id,"failed")]);
    const progress = (await readDailyRuns(db))[0];
    assert.equal(progress.status,"RUNNING"); assert.equal(progress.finishedAt,null);
    assert.deepEqual([progress.collected,progress.skipped,progress.failed,progress.deferred,progress.moreAccounts],[1,1,1,1,1]);
    await finishDailyRun(db,id,"INCOMPLETE",new Date("2026-10-19T06:06:00Z"));
    await startDailyRun(db,"authorized",new Date("2026-10-19T08:00:00Z"));
    const records = await readDailyRuns(db);
    assert.equal(records.length,2); assert.equal(records[1].status,"INCOMPLETE");
    assert.equal(sqlite.prepare("SELECT value FROM Existing").get().value,"preserve");
    await recordDailyOutcome(db,id,"collected");
    assert.equal((await readDailyRuns(db))[1].collected,1);
  } finally {sqlite.close();}
});
