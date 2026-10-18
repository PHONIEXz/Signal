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
  time?: () => number;
  budgetMs?: number;
}) {
  const time = dependencies.time ?? Date.now;
  const deadline = time() + (dependencies.budgetMs ?? 150000);
  const result = { collected: 0, skipped: 0, failed: 0, deferred: 0 };
  // Three bounded workers; stop starting new accounts well before the function deadline.
  let next = 0;
  async function worker() {
    while (next < accounts.length && time() < deadline) {
      const account = accounts[next++];
      try {
        if (!await dependencies.claim(account.id)) { result.skipped++; continue; }
        const response = await dependencies.collect(account.id);
        if (response.cached) result.skipped++;
        else if (response.ok) result.collected++;
        else result.failed++;
      } catch { result.failed++; }
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  result.deferred = accounts.length - next;
  return result;
}
