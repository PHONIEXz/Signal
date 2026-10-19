import { randomUUID } from "node:crypto";

/** Additive operational ledger: separate from expiring authentication/usage counters. */
export const dailyRunDDL = `CREATE TABLE IF NOT EXISTS "SignalDailyRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "day" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "startedAt" TEXT NOT NULL,
  "finishedAt" TEXT,
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "eligible" INTEGER NOT NULL DEFAULT 0,
  "collected" INTEGER NOT NULL DEFAULT 0,
  "skipped" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "deferred" INTEGER NOT NULL DEFAULT 0,
  "moreAccounts" INTEGER NOT NULL DEFAULT 0
)`;
export type DailyRun = {
  id: string; day: string; trigger: string; startedAt: string; finishedAt: string | null;
  status: string; eligible: number; collected: number; skipped: number; failed: number;
  deferred: number; moreAccounts: number;
};
export type RunDatabase = {
  $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<number>;
  $queryRawUnsafe: <T = unknown>(query: string, ...values: unknown[]) => Promise<T>;
};
export async function startDailyRun(db: RunDatabase, trigger: "scheduler" | "authorized", now = new Date()) {
  await db.$executeRawUnsafe(dailyRunDDL);
  await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "SignalDailyRun_day_startedAt_idx" ON "SignalDailyRun"("day", "startedAt")');
  const id = randomUUID();
  await db.$executeRawUnsafe('INSERT INTO "SignalDailyRun" ("id", "day", "trigger", "startedAt") VALUES (?, ?, ?, ?)', id, now.toISOString().slice(0,10), trigger, now.toISOString());
  return id;
}
export async function setDailyRunScope(db: RunDatabase, id: string, eligible: number, moreAccounts: boolean) {
  await db.$executeRawUnsafe('UPDATE "SignalDailyRun" SET "eligible" = ?, "deferred" = ?, "moreAccounts" = ? WHERE "id" = ?', eligible, eligible, Number(moreAccounts), id);
}
export async function recordDailyOutcome(db: RunDatabase, id: string, outcome: "collected" | "skipped" | "failed") {
  // The column is allowlisted; all variable data uses bound parameters.
  const column = {collected:'"collected"', skipped:'"skipped"', failed:'"failed"'}[outcome];
  if (!column) throw new Error("Invalid collection outcome");
  await db.$executeRawUnsafe(`UPDATE "SignalDailyRun" SET ${column} = ${column} + 1, "deferred" = MAX(0, "deferred" - 1) WHERE "id" = ? AND "status" = 'RUNNING'`, id);
}
export async function finishDailyRun(db: RunDatabase, id: string, status: "COMPLETE" | "INCOMPLETE" | "FAILED" | "PAUSED", now = new Date()) {
  await db.$executeRawUnsafe('UPDATE "SignalDailyRun" SET "status" = ?, "finishedAt" = ? WHERE "id" = ?', status, now.toISOString(), id);
}
export async function readDailyRuns(db: RunDatabase): Promise<DailyRun[]> {
  const exists = await db.$queryRawUnsafe<{name:string}[]>("SELECT name FROM sqlite_master WHERE type='table' AND name='SignalDailyRun'");
  if (!exists.length) return [];
  return db.$queryRawUnsafe<DailyRun[]>(`SELECT * FROM (SELECT * FROM "SignalDailyRun" WHERE "trigger" = 'scheduler' ORDER BY "startedAt" DESC, "id" DESC LIMIT 20) UNION ALL SELECT * FROM (SELECT * FROM "SignalDailyRun" WHERE "trigger" = 'authorized' ORDER BY "startedAt" DESC, "id" DESC LIMIT 20) ORDER BY "startedAt" DESC`);
}
