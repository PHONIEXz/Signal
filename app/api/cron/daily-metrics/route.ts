import { startDailyRun, setDailyRunScope, recordDailyOutcome, finishDailyRun } from "@/lib/daily-run-store";
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

  const now = new Date();
  const day = utcDayStart(now);
  let runId: string | undefined;
  try {
    // A durable start record is required before any external collection.
    runId = await startDailyRun(prisma, request.headers.get("user-agent") === "vercel-cron/1.0" ? "scheduler" : "authorized", now);
    if (!enabled("metrics")) {
      await finishDailyRun(prisma, runId, "PAUSED");
      return json({error: "Metrics collection is paused.", runId}, 503);
    }
    const accounts = await prisma.connectedAccount.findMany({
      where: { platform: {in: ["x", "facebook", "tiktok"]}, user: {analyticsCollectionEnabled: true},
        metricSnapshots: {none: {fetchedAt: {gte: day}, sampleSize: 10, postMetricsStatus: {in: ["AVAILABLE", "PARTIAL", "EMPTY"]}}} },
      // Stale accounts first; an interrupted batch does not starve them indefinitely.
      orderBy: [{metricSync: {lastAttemptAt: "asc"}}, {id: "asc"}],
      select: {id: true}, take: 101,
    });
    await setDailyRunScope(prisma, runId, Math.min(accounts.length, 100), accounts.length > 100);
    const activeRunId = runId;
    const summary = await runDailyMetrics(accounts.slice(0, 100), {
      recordOutcome: outcome => recordDailyOutcome(prisma, activeRunId, outcome),
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
    await finishDailyRun(prisma, runId, incomplete ? "INCOMPLETE" : "COMPLETE");
    // No tokens, user identities or provider payloads in job logs.
    console.info("daily-metrics", {runId, ...summary, moreAccounts: accounts.length > 100});
    return json({...summary, runId, moreAccounts: accounts.length > 100}, incomplete ? 503 : 200);
  } catch {
    if (runId) await finishDailyRun(prisma, runId, "FAILED").catch(() => {});
    console.error("daily-metrics: collection infrastructure failed", {runId: runId ?? "not-started"});
    return json({error: "Daily collection could not finish. Saved history is preserved."}, 503);
  }
}
