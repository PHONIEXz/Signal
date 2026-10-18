import { prisma } from "@/lib/prisma";
import { refreshAccountMetrics } from "@/lib/metrics-refresh";
import { authorizedCron, runDailyMetrics, utcDayStart } from "@/lib/daily-metrics";
import { PRIVATE_HEADERS } from "@/lib/auth-http";
import { enabled } from "@/lib/service-config";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const json = (body: unknown, status = 200) => Response.json(body, {status, headers: PRIVATE_HEADERS});
  if (!authorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) return json({error: "Unauthorized"}, 401);
  if (process.env.VERCEL && process.env.VERCEL_ENV !== "production") return json({error: "Daily collection runs in production only."}, 403);
  if (!enabled("metrics")) return json({error: "Metrics collection is paused."}, 503);
  const now = new Date();
  const day = utcDayStart(now);
  try {
    const accounts = await prisma.connectedAccount.findMany({
      where: { platform: {in: ["x", "facebook", "tiktok"]}, user: {analyticsCollectionEnabled: true},
        metricSnapshots: {none: {fetchedAt: {gte: day}, sampleSize: 10, postMetricsStatus: {in: ["AVAILABLE", "PARTIAL", "EMPTY"]}}} },
      // Stale accounts first; an interrupted batch does not starve them indefinitely.
      orderBy: [{metricSync: {lastAttemptAt: "asc"}}, {id: "asc"}],
      select: {id: true}, take: 101,
    });
    const summary = await runDailyMetrics(accounts.slice(0, 100), {
      claim: async id => {
        const key = `daily-metrics:${id}:${day.toISOString().slice(0,10)}`;
        const row = await prisma.authRateLimit.upsert({where: {key}, create: {key, count: 1, expiresAt: new Date(now.getTime() + 7 * 86400000)}, update: {count: {increment: 1}}});
        return row.count === 1;
      },
      collect: async id => {
        const response = await refreshAccountMetrics(id, 10);
        const body = await response.json();
        return {ok: response.ok && body.success === true, cached: body.cached === true};
      },
    });
    const incomplete = summary.failed > 0 || summary.deferred > 0 || accounts.length > 100;
    // No tokens, user identities or provider payloads in job logs.
    console.info("daily-metrics", {...summary, moreAccounts: accounts.length > 100});
    return json({...summary, moreAccounts: accounts.length > 100}, incomplete ? 503 : 200);
  } catch {
    console.error("daily-metrics: collection infrastructure failed");
    return json({error: "Daily collection could not finish. Saved history is preserved."}, 503);
  }
}
