import { timingSafeEqual } from "node:crypto";

export function authorizedCron(header: string | null, secret: string | undefined) {
  if (!secret || secret.length < 16 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function utcDayStart(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Durable claims prevent duplicate cron deliveries consuming provider allowance twice. */
export async function runDailyMetrics(accounts: { id: string }[], dependencies: {
  claim: (id: string) => Promise<boolean>;
  collect: (id: string) => Promise<{ ok: boolean; cached: boolean }>;
  recordOutcome?: (outcome: "collected" | "skipped" | "failed") => Promise<void>;
  time?: () => number;
  budgetMs?: number;
}) {
  const time = dependencies.time ?? Date.now;
  const deadline = time() + (dependencies.budgetMs ?? 150000);
  const result = { collected: 0, skipped: 0, failed: 0, deferred: 0 };
  // Three bounded workers; stop starting new accounts well before the function deadline.
  let next = 0;
  let stopped = false;
  async function worker() {
    while (!stopped && next < accounts.length && time() < deadline) {
      const account = accounts[next++];
      let outcome: "collected" | "skipped" | "failed";
      try {
        if (!await dependencies.claim(account.id)) outcome = "skipped";
        else {
          const response = await dependencies.collect(account.id);
          outcome = response.cached ? "skipped" : response.ok ? "collected" : "failed";
        }
      } catch { outcome = "failed"; }
      result[outcome]++;
      try { await dependencies.recordOutcome?.(outcome); }
      catch (error) { stopped = true; throw error; }
    }
  }
  // Let in-flight work settle before finalizing a failed ledger; never start more work.
  const workers = await Promise.allSettled([worker(), worker(), worker()]);
  const failure = workers.find(worker => worker.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
  result.deferred = accounts.length - next;
  return result;
}
