import crypto from "node:crypto";
import { prisma } from "./prisma.ts";
import { completeSum, postEngagement, missingCountFields, type CollectedPost } from "./metric-measurements.ts";

export async function metricsSchemaReady() {
  const tables = await prisma.$queryRawUnsafe<{ name: string }[]>("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('MetricSync','PostMeasurement','PageInsight')");
  return tables.length === 3;
}
export async function claimMetricSync(accountId: string, userId: string, plan: string, requestedPosts: number, now = new Date()) {
  return prisma.$transaction(async tx => {
    await tx.metricSync.upsert({ where: { connectedAccountId: accountId }, create: { connectedAccountId: accountId }, update: {} });
    const lockId = crypto.randomUUID();
    const result = await tx.metricSync.updateMany({ where: { connectedAccountId: accountId, AND: [ { OR: [{ lockUntil: null }, { lockUntil: { lte: now } }] }, { OR: [{ nextAllowedAt: null }, { nextAllowedAt: { lte: now } }] } ] },
      data: { lockId, lockUntil: new Date(now.getTime()+300000), nextAllowedAt: new Date(now.getTime()+900000), lastAttemptAt: now, status: "RUNNING", requestedPosts, warning: null } });
    if (!result.count) return null;
    const key = `metrics:${userId}:${now.toISOString().slice(0,10)}`;
    const rate = await tx.authRateLimit.upsert({ where: { key }, create: { key, count: 1, expiresAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1)) }, update: { count: { increment: 1 } } });
    if (rate.count > (plan === "PRO" ? 48 : 12)) {
      await tx.metricSync.update({ where: { connectedAccountId: accountId }, data: { lockId: null, lockUntil: null, nextAllowedAt: rate.expiresAt, status: "LIMITED", warning: "Daily collection limit reached. Cached data remains available." } });
      return null;
    }
    return lockId;
  });
}
export async function finishMetricFailure(accountId: string, lockId: string, warning: string) {
  await prisma.metricSync.updateMany({ where: { connectedAccountId: accountId, lockId }, data: { lockId: null, lockUntil: null, status: "FAILED", warning, nextAllowedAt: new Date(Date.now()+900000) } });
}
export async function storeCollection(input: {
  accountId: string; lockId: string; platform: string; posts: CollectedPost[]; requested: number;
  complete: boolean; warning: string | null; source: "API" | "CSV";
  accountMetrics?: { followers: number | null; following: number | null; totalPosts: number | null };
  insights?: { metric: string; period: string; periodEnd: Date; value: number }[];
  capturedAt?: Date;
}) {
  const capturedAt = input.capturedAt ?? new Date();
  const sampleId = crypto.randomUUID();
  const missing = missingCountFields(input.posts, input.platform);
  const status = !input.complete ? input.posts.length ? "PARTIAL" : "UNAVAILABLE" : !input.posts.length ? "EMPTY" : missing.length ? "PARTIAL" : "AVAILABLE";
  const warning = [input.warning, missing.length && `Unavailable fields: ${missing.join(", ")}.`, !input.posts.length && input.complete && "The platform returned no posts for this account."].filter(Boolean).join(" ") || null;
  await prisma.$transaction(async tx => {
    const lease = await tx.metricSync.findUnique({ where: { connectedAccountId: input.accountId } });
    if (!lease || lease.lockId !== input.lockId || !lease.lockUntil || lease.lockUntil <= new Date()) throw new Error("Metric collection lease expired");
    for (const p of input.posts) {
      const { id, url, ...data } = p;
      const existing = await tx.post.findUnique({ where: { connectedAccountId_platformPostId: { connectedAccountId: input.accountId, platformPostId: id } } });
      const latest = existing ? await tx.postMeasurement.findFirst({ where: { postId: existing.id, source: { not: "LEGACY" } }, orderBy: { capturedAt: "desc" } }) : null;
      const post = await tx.post.upsert({ where: { connectedAccountId_platformPostId: { connectedAccountId: input.accountId, platformPostId: id } },
        create: { connectedAccountId: input.accountId, platformPostId: id, ...data, url, permalinkUrl: url, fetchedAt: capturedAt }, update: latest && latest.capturedAt > capturedAt ? {} : { ...data, url, permalinkUrl: url, fetchedAt: capturedAt } });
      await tx.postMeasurement.create({ data: { postId: post.id, source: input.source, sampleId, capturedAt, likeCount: p.likeCount, viewCount: p.viewCount, replyCount: p.replyCount, retweetCount: p.retweetCount, quoteCount: p.quoteCount } });
    }
    if (input.source === "API" && input.accountMetrics?.followers !== null && input.accountMetrics?.followers !== undefined) {
      await tx.metricSnapshot.create({ data: { id: sampleId, connectedAccountId: input.accountId, followersCount: input.accountMetrics.followers, followingCount: input.accountMetrics.following, postCount: input.accountMetrics.totalPosts,
        totalLikes: completeSum(input.posts.map(p=>p.likeCount)), totalViews: completeSum(input.posts.map(p=>p.viewCount)), totalEngagements: completeSum(input.posts.map(postEngagement)),
        sampleSize: input.requested, postsAnalyzed: input.posts.length, postMetricsStatus: status, fetchedAt: capturedAt } });
    }
    for (const insight of input.insights ?? []) await tx.pageInsight.upsert({ where: { connectedAccountId_metric_period_periodEnd: { connectedAccountId: input.accountId, metric: insight.metric, period: insight.period, periodEnd: insight.periodEnd } }, create: { connectedAccountId: input.accountId, ...insight }, update: { value: insight.value, fetchedAt: capturedAt } });
    await tx.metricSync.update({ where: { connectedAccountId: input.accountId }, data: { lockId: null, lockUntil: null, status: status === "UNAVAILABLE" ? "FAILED" : status, source: input.source, receivedPosts: input.posts.length, requestedPosts: input.requested, missingFields: JSON.stringify(missing), warning,
      lastSuccessAt: input.complete || input.posts.length ? new Date() : lease.lastSuccessAt } });
  });
  return { success: true, source: input.source, sampleId, sampleSize: input.requested, postsAnalyzed: input.posts.length, warning, status };
}
