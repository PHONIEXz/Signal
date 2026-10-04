import { NextResponse } from "next/server";
import { auth } from "../auth.ts";
import { prisma } from "./prisma.ts";
import { decrypt } from "./encryption.ts";
import { creatorProfile, creatorPosts, CreatorApiError, type CreatorPlatform } from "./creator-platforms.ts";
import { youtubeToken } from "./creator-oauth.ts";
import { youtubeReports } from "./youtube-reports.ts";
import { normalizeSampleSize } from "./metrics.ts";
import { readAuthBody, AuthInputError, PRIVATE_HEADERS, requestOrigin } from "./auth-http.ts";
import { metricsSchemaReady, claimMetricSync, finishMetricFailure, storeCollection } from "./metric-storage.ts";
import { reserveUsage, recordUsageFailure, UsageError } from "./service-usage.ts";
import { refreshFeedback } from "./refresh-feedback.ts";
import { MetricTokenError } from "./metric-diagnostics.ts";
export async function refreshCreatorMetrics(request: Request, platform: CreatorPlatform) {
    const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
    const session = await auth();
    if (!session?.user?.id)
        return json({ error: "Not authenticated" }, 401);
    let lockId: string | null = null;
    let accountId = "";
    try {
        const body = await readAuthBody(request, 4096, requestOrigin(request));
        const account = await prisma.connectedAccount.findUnique({ where: { userId_platform: { userId: session.user.id, platform } }, include: { user: { select: { plan: true, analyticsCollectionEnabled: true } } } });
        if (!account?.platformUserId)
            return json({ error: "Connect this platform first." }, 404);
        if (!account.user.analyticsCollectionEnabled)
            return json({ error: "Analytics collection is disabled in settings." }, 403);
        accountId = account.id;
        if (!await metricsSchemaReady())
            return json({ error: "Metrics schema is not ready." }, 503);
        const requested = normalizeSampleSize(typeof body.postLimit === "number" || typeof body.postLimit === "string" ? body.postLimit : undefined, account.user.plan);
        if (platform === "youtube" && body.days !== undefined && ![7, 28, 90].includes(body.days as number))
            return json({ error: "Choose 7, 28 or 90 days." }, 400);
        lockId = await claimMetricSync(account.id, session.user.id, account.user.plan, requested);
        if (!lockId) {
            const sync = await prisma.metricSync.findUnique({ where: { connectedAccountId: account.id } });
            return json({ success: true, cached: true, ...refreshFeedback(sync?.status ?? "NEVER", true), warning: sync?.warning, nextAllowedAt: sync?.nextAllowedAt });
        }
        await reserveUsage("metrics", session.user.id, account.user.plan);
        if (platform === "instagram" && account.expiresAt && account.expiresAt.getTime() <= Date.now())
            throw new CreatorApiError("Instagram authorization expired. Reauthorize the original professional account.");
        const token = platform === "youtube" ? await youtubeToken(account.id) : decrypt(account.accessToken);
        const deadline=AbortSignal.timeout(150000);
        const boundedFetch:typeof fetch=(input,init)=>{
            deadline.throwIfAborted();
            return fetch(input,{...init,signal:AbortSignal.any([deadline,...init?.signal?[init.signal]:[]])});
        };
        const profile = await creatorProfile(platform, account.platformUserId, token,boundedFetch);
        const collection = await creatorPosts(platform, account.platformUserId, token, requested, profile.uploads,boundedFetch);
        if (platform === "youtube") {
            const analytics = collection.complete ? await youtubeReports(profile.id, token, (body.days ?? 28) as 7 | 28 | 90,boundedFetch,collection.posts) : null;
            const warning = [collection.warning, ...analytics?.warnings ?? []].filter(Boolean).join(" ") || null;
            // YouTube has its own official reports. Do not persist into tables used for
            // Signal Score, cross-platform sums, AI evidence or derived growth metrics.
            const status = collection.complete ? collection.posts.length ? "AVAILABLE" : "EMPTY" : collection.posts.length ? "PARTIAL" : "FAILED";
            const updated = await prisma.metricSync.updateMany({ where: { connectedAccountId: account.id, lockId, lockUntil: { gt: new Date() } }, data: { lockId: null, lockUntil: null, status, source: "API", warning, receivedPosts: collection.posts.length, lastSuccessAt: status !== "FAILED" ? new Date() : undefined } });
            if (updated.count !== 1)
                throw Error("Collection lease expired");
            if (status === "FAILED") {
                await recordUsageFailure("metrics");
                return json({ error: warning ?? "YouTube collection was unavailable." }, 502);
            }
            return json({ success: true, message: "Official YouTube data loaded for this visit. Reports are not saved to Signal history.", youtube: { profile, posts: collection.posts, analytics, measuredAt: new Date().toISOString() }, warning });
        }
        await prisma.connectedAccount.update({ where: { id: account.id }, data: { displayName: profile.name } });
        const result = await storeCollection({ accountId: account.id, lockId, platform, posts: collection.posts, requested, complete: collection.complete, warning: collection.warning, source: "API", accountMetrics: profile });
        if (result.status === "UNAVAILABLE")
            await recordUsageFailure("metrics");
        return json({ success: result.status !== "UNAVAILABLE", ...refreshFeedback(result.status), warning: result.warning, ...result.status === "UNAVAILABLE" ? { error: result.warning } : {} }, result.status === "UNAVAILABLE" ? 502 : 200);
    }
    catch (error) {
        const warning = error instanceof CreatorApiError || error instanceof MetricTokenError || error instanceof UsageError || error instanceof AuthInputError ? error.message : "Signal could not finish collection. Please try again later; the server needs review.";
        if (lockId)
            await finishMetricFailure(accountId, lockId, warning, error instanceof UsageError ? error.resetAt : undefined).catch(() => { });
        if (!(error instanceof AuthInputError))
            await recordUsageFailure("metrics");
        return json({ error: warning }, error instanceof AuthInputError ? error.status : error instanceof UsageError ? error.status : error instanceof CreatorApiError || error instanceof MetricTokenError ? 502 : 500);
    }
}
