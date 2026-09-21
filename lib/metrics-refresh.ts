import { reserveUsage, recordUsageFailure, UsageError } from "./service-usage.ts";
import { refreshFeedback } from "./refresh-feedback.ts";
import { NextResponse } from "next/server";
import { auth } from "../auth.ts";
import { prisma } from "./prisma.ts";
import { decrypt } from "./encryption.ts";
import { getValidXAccessToken } from "./x-token.ts";
import { getValidTikTokAccessToken } from "./tiktok-token.ts";
import { normalizeSampleSize } from "./metrics.ts";
import { readAuthBody, AuthInputError, PRIVATE_HEADERS, requestOrigin } from "./auth-http.ts";
import { measured } from "./metric-measurements.ts";
import { collectPosts, collectPageInsights } from "./metrics-collector.ts";
import { metricsSchemaReady, claimMetricSync, finishMetricFailure, storeCollection } from "./metric-storage.ts";
import { xPostsWarning } from "./post-retrieval.ts";

export async function refreshMetrics(request: Request, platform: string) {
  const json = (body: unknown, status=200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
  const session = await auth();
  if (!session?.user?.id) return json({error:"Not authenticated"},401);
  let lockId: string | null = null;
  let accountId = "";
  try {
    const body = await readAuthBody(request, 4096, requestOrigin(request));
    const account = await prisma.connectedAccount.findUnique({ where: { userId_platform: { userId: session.user.id, platform } }, include: { user: { select: { plan: true, analyticsCollectionEnabled: true } } } });
    if (!account) return json({ error:"No account connected" },404);
    if (!account.user.analyticsCollectionEnabled) return json({ error:"Analytics collection is disabled in settings." },403);
    accountId = account.id;
    if (!await metricsSchemaReady()) return json({ error:"Metrics are temporarily unavailable. Please try again later.", code:"METRICS_SCHEMA_PENDING" },503);
    const requested = normalizeSampleSize(typeof body.postLimit === "number" || typeof body.postLimit === "string" ? body.postLimit : undefined, account.user.plan);
    lockId = await claimMetricSync(account.id, session.user.id, account.user.plan, requested);
    if (!lockId) {
      const sync = await prisma.metricSync.findUnique({ where: { connectedAccountId: account.id } });
      return json({ success:true, cached:true, sampleSize:sync?.requestedPosts ?? 0, postsAnalyzed:sync?.receivedPosts ?? 0,
        ...refreshFeedback(sync?.status ?? "NEVER", true), nextAllowedAt:sync?.nextAllowedAt });
    }
    await reserveUsage("metrics", session.user.id, account.user.plan);
    const token = platform === "x" ? await getValidXAccessToken(account.id) : platform === "tiktok" ? await getValidTikTokAccessToken(account.id) : decrypt(account.accessToken);
    let userId = account.platformUserId;
    const profileUrl = platform === "x" ? "https://api.x.com/2/users/me?user.fields=public_metrics,name,username" : platform === "facebook" ? `https://graph.facebook.com/v26.0/${userId}?fields=name,followers_count` : "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,follower_count,following_count,video_count";
    let profileWarning: string | null = null;
    let metrics: { followers:number|null; following:number|null; totalPosts:number|null } | undefined;
    try {
      const response = await fetch(profileUrl,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(10000)});
      const data = await response.json();
      if (!response.ok || (platform === "tiktok" && data?.error?.code && data.error.code !== "ok")) {
        // Billing/token failures should not launch a second costly or rejected request.
        if ([401,402,429].includes(response.status)) { const warning = platform === "x" ? xPostsWarning(response.status) : "The platform rejected account reading. Check the token or rate limit."; await finishMetricFailure(account.id,lockId,warning); return json({error:"We could not refresh this account. Check its connection in Accounts and try again."},502); }
        profileWarning = "Account counters were unavailable; posts were requested separately.";
      } else {
        const user = platform === "x" ? data.data : platform === "tiktok" ? data.data?.user : data;
        if (user) {
          userId = platform === "x" ? user.id ?? userId : platform === "tiktok" ? user.open_id ?? userId : userId;
          if (account.platformUserId && userId !== account.platformUserId) {
            await finishMetricFailure(account.id,lockId,"Connection identity did not match.");
            return json({error:"Reconnect your original account before refreshing."},409);
          }
          const name = platform === "tiktok" ? user.display_name : user.name;
          metrics = { followers: measured(platform === "x" ? user.public_metrics?.followers_count : platform === "facebook" ? user.followers_count : user.follower_count), following: measured(platform === "x" ? user.public_metrics?.following_count : platform === "facebook" ? null : user.following_count), totalPosts:measured(platform === "x" ? user.public_metrics?.tweet_count : platform === "facebook" ? null : user.video_count) };
          await prisma.connectedAccount.update({where:{id:account.id},data:{platformUserId:userId,displayName:typeof name === "string" ? name : account.displayName}});
          if (metrics.followers === null) profileWarning = "Follower counters were unavailable. No substitute zero was saved.";
        }
      }
    } catch { profileWarning="Account counters could not be retrieved; cached account history was preserved."; }
    if (!userId) { await finishMetricFailure(account.id,lockId,"Reconnect this account to identify the platform profile."); return json({error:"Reconnect this account to identify the platform profile."},400); }
    const collection = await collectPosts(platform,userId,token,requested);
    const insight = platform === "facebook" && collection.complete ? await collectPageInsights(userId,token) : { values:[], warnings:[] };
    const warning = [profileWarning,collection.warning,...insight.warnings].filter(Boolean).join(" ") || null;
    const stored = await storeCollection({accountId:account.id,lockId,platform,posts:collection.posts,requested,complete:collection.complete,source:"API",warning,accountMetrics:metrics,insights:insight.values});
    if (stored.status === "UNAVAILABLE") await recordUsageFailure("metrics");
    return json({ success: stored.status !== "UNAVAILABLE", sampleSize: stored.sampleSize, postsAnalyzed: stored.postsAnalyzed, ...refreshFeedback(stored.status) }, stored.status === "UNAVAILABLE" ? 502 : 200);
  } catch (error) {
    if (lockId) await finishMetricFailure(accountId,lockId,"Collection did not complete. Cached data was preserved.").catch(()=>{});
    if (error instanceof UsageError) return json({ error:error.message + (error.resetAt ? ` Resets ${error.resetAt.slice(0,10)} at 00:00 UTC.` : ""), resetAt:error.resetAt },error.status);
    await recordUsageFailure("metrics");
    return json({ error:error instanceof AuthInputError ? error.message : "We could not refresh your metrics. Your saved data is still available. Please try again later." },error instanceof AuthInputError ? error.status : 500);
  }
}
