export type RefreshGate = { reason: string | null; availableAt: string | null };
export type RefreshLimit = { count: number; cap: number; resetAt: Date; reason: string };

/** Read-only explanation of the existing limits. Never reserves or raises an allowance. */
export function buildRefreshGate({ now, enabled, analyticsEnabled, limits, nextAllowedAt }: {
  now: Date; enabled: boolean; analyticsEnabled: boolean; limits: RefreshLimit[]; nextAllowedAt?: Date | null;
}): RefreshGate {
  if (!enabled) return { reason: "Metric collection is temporarily paused by Signal.", availableAt: null };
  if (!analyticsEnabled) return { reason: "Analytics collection is paused in Settings.", availableAt: null };
  const blocked = limits.filter(limit => limit.count >= limit.cap && limit.resetAt > now)
    .sort((a,b) => b.resetAt.getTime() - a.resetAt.getTime());
  const limit = blocked[0];
  const until = Math.max(limit?.resetAt.getTime() ?? 0, nextAllowedAt && nextAllowedAt > now ? nextAllowedAt.getTime() : 0);
  if (!until) return { reason: null, availableAt: null };
  return { reason: limit?.reason ?? "This account is cooling down after its last refresh.", availableAt: new Date(until).toISOString() };
}
