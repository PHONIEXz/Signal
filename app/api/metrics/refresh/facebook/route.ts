import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { normalizeSampleSize } from "@/lib/metrics";
import { normalizeFacebookPost } from "@/lib/platform-data";
import { retrieveFacebookPosts } from "@/lib/post-retrieval";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const connectedAccount = await prisma.connectedAccount.findUnique({
    where: { userId_platform: { userId: session.user.id, platform: "facebook" } },
    include: { user: { select: { plan: true } } },
  });

  if (!connectedAccount || !connectedAccount.platformUserId) {
    return NextResponse.json({ error: "No Facebook Page connected" }, { status: 404 });
  }

  try {
    let body: { postLimit?: unknown } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const postLimit = normalizeSampleSize(
      typeof body.postLimit === "number" || typeof body.postLimit === "string"
        ? body.postLimit
        : undefined,
      connectedAccount.user.plan
    );

    const accessToken = decrypt(connectedAccount.accessToken);
    const pageId = connectedAccount.platformUserId;

    const pageUrl = new URL(`https://graph.facebook.com/v26.0/${pageId}`);
    pageUrl.searchParams.set("fields", "name,followers_count");

    const facebookRequest = {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store" as const,
      signal: AbortSignal.timeout(15000),
    };

    const pageRes = await fetch(pageUrl, facebookRequest);
    if (!pageRes.ok) {
      return NextResponse.json({ error: "Facebook API request failed" }, { status: 502 });
    }
    const pageData = await pageRes.json();

    if (
      typeof pageData.name === "string" &&
      pageData.name !== connectedAccount.displayName
    ) {
      await prisma.connectedAccount.update({
        where: { id: connectedAccount.id },
        data: { displayName: pageData.name },
      });
    }

    let totalLikes: number | null = null;
    let totalEngagements: number | null = null;
    let postsAnalyzed = 0;
    let postMetricsStatus = "UNAVAILABLE";
    let postsWarning: string | null = null;

    const retrieval = await retrieveFacebookPosts(pageId, accessToken, postLimit);
    const previous = await prisma.metricSnapshot.findFirst({ where: { connectedAccountId: connectedAccount.id }, orderBy: { fetchedAt: "desc" } });
    const previouslyContentOnly = previous?.postMetricsStatus === "CONTENT_ONLY";
    let cachedCountsUnavailable = false;
    if (previouslyContentOnly && retrieval.posts?.length && !retrieval.contentOnly) {
      const cached = await prisma.post.findMany({ where: { connectedAccountId: connectedAccount.id }, select: { platformPostId: true } });
      const measuredIds = new Set(retrieval.posts.map(post => post.id));
      cachedCountsUnavailable = cached.some(post => !measuredIds.has(post.platformPostId));
    }
    postsWarning = retrieval.warning;
    if (!retrieval.posts || !retrieval.posts.length) {
      if (previouslyContentOnly) postMetricsStatus = "CONTENT_ONLY";
    }
    if (retrieval.posts) {
      const posts = retrieval.posts;

      totalLikes = posts.length && !retrieval.contentOnly ? 0 : null;
      totalEngagements = posts.length && !retrieval.contentOnly ? 0 : null;

      for (const post of posts) {
        const normalized = normalizeFacebookPost(post);
        if (!retrieval.contentOnly) { totalLikes = (totalLikes ?? 0) + normalized.likeCount; totalEngagements = (totalEngagements ?? 0) + normalized.engagementCount; }

        await prisma.post.upsert({
          where: {
            connectedAccountId_platformPostId: {
              connectedAccountId: connectedAccount.id,
              platformPostId: post.id,
            },
          },
          update: {
            text: normalized.text,
            url: normalized.url,
            permalinkUrl: normalized.url,
            ...(retrieval.contentOnly ? {} : { likeCount: normalized.likeCount, replyCount: normalized.replyCount, retweetCount: normalized.shareCount }),
            postedAt: normalized.postedAt,
          },
          create: {
            connectedAccountId: connectedAccount.id,
            platformPostId: post.id,
            text: normalized.text,
            url: normalized.url,
            permalinkUrl: normalized.url,
            likeCount: normalized.likeCount,
            replyCount: normalized.replyCount,
            retweetCount: normalized.shareCount,
            postedAt: normalized.postedAt,
          },
        });
      }
      postsAnalyzed = posts.length;
      postMetricsStatus = !posts.length ? postMetricsStatus === "CONTENT_ONLY" ? "CONTENT_ONLY" : "EMPTY" : retrieval.contentOnly || cachedCountsUnavailable ? "CONTENT_ONLY" : "PARTIAL";
      if (cachedCountsUnavailable) {
        totalLikes = null;
        totalEngagements = null;
        postsWarning = "Recent Facebook posts were retrieved, but some older cached posts still lack engagement counts. Counts remain unavailable until those posts are refreshed too.";
      }
      if (!posts.length) postsWarning = "Facebook returned no posts from this Page. Confirm this is the intended Page and that its posts are published.";
    }

    await prisma.metricSnapshot.create({
      data: {
        connectedAccountId: connectedAccount.id,
        followersCount: pageData.followers_count ?? 0,
        followingCount: null,
        postCount: null,
        totalLikes,
        totalViews: null,
        totalEngagements,
        postsAnalyzed,
        sampleSize: postLimit,
        postMetricsStatus,
      },
    });

    return NextResponse.json({
      success: true,
      sampleSize: postLimit,
      postsAnalyzed,
      warning:
        postMetricsStatus !== "PARTIAL"
          ? postsWarning
          : "Facebook views and total post count are not available from this connection.",
    });
  } catch {
    return NextResponse.json(
      { error: "Facebook refresh could not complete. Check the Page connection and server availability, then try again." },
      { status: 500 }
    );
  }
}
