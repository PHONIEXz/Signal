import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getValidXAccessToken } from "@/lib/x-token";
import { normalizeSampleSize } from "@/lib/metrics";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const connectedAccount = await prisma.connectedAccount.findUnique({
    where: { userId_platform: { userId: session.user.id, platform: "x" } },
    include: { user: { select: { plan: true } } },
  });

  if (!connectedAccount) {
    return NextResponse.json({ error: "No X account connected" }, { status: 404 });
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

    const accessToken = await getValidXAccessToken(connectedAccount.id);

    // Step 1: account-level stats + confirm the platform user ID
    const meRes = await fetch(
      "https://api.x.com/2/users/me?user.fields=public_metrics",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!meRes.ok) {
      return NextResponse.json({ error: "X API request failed" }, { status: 502 });
    }

    const meData = await meRes.json();
    const accountMetrics = meData.data?.public_metrics;
    const platformUserId = meData.data?.id;

    if (!accountMetrics || !platformUserId) {
      return NextResponse.json({ error: "Unexpected response from X" }, { status: 502 });
    }

    if (connectedAccount.platformUserId !== platformUserId) {
      await prisma.connectedAccount.update({
        where: { id: connectedAccount.id },
        data: { platformUserId },
      });
    }

    // Step 2: recent posts, for likes + views
    let totalLikes: number | null = null;
    let totalViews: number | null = null;
    let totalEngagements: number | null = null;
    let postsAnalyzed = 0;
    let postMetricsStatus = "UNAVAILABLE";

    const postsRes = await fetch(
      `https://api.x.com/2/users/${platformUserId}/tweets?max_results=${postLimit}&tweet.fields=public_metrics,created_at`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (postsRes.ok) {
      const postsData = await postsRes.json();
      const posts: Array<{
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: {
          like_count?: number;
          impression_count?: number;
          reply_count?: number;
          retweet_count?: number;
          quote_count?: number;
        };
      }> = postsData.data ?? [];

      totalLikes = 0;
      totalViews = 0;
      totalEngagements = 0;

      for (const post of posts) {
        const metrics = post.public_metrics ?? {};
        totalLikes += metrics.like_count ?? 0;
        totalViews += metrics.impression_count ?? 0;
        totalEngagements +=
          (metrics.like_count ?? 0) +
          (metrics.reply_count ?? 0) +
          (metrics.retweet_count ?? 0) +
          (metrics.quote_count ?? 0);

        await prisma.post.upsert({
          where: {
            connectedAccountId_platformPostId: {
              connectedAccountId: connectedAccount.id,
              platformPostId: post.id,
            },
          },
          update: {
            text: post.text,
            likeCount: metrics.like_count ?? 0,
            viewCount: metrics.impression_count ?? 0,
            replyCount: metrics.reply_count ?? 0,
            retweetCount: metrics.retweet_count ?? 0,
            quoteCount: metrics.quote_count ?? 0,
            postedAt: post.created_at ? new Date(post.created_at) : null,
          },
          create: {
            connectedAccountId: connectedAccount.id,
            platformPostId: post.id,
            text: post.text,
            likeCount: metrics.like_count ?? 0,
            viewCount: metrics.impression_count ?? 0,
            replyCount: metrics.reply_count ?? 0,
            retweetCount: metrics.retweet_count ?? 0,
            quoteCount: metrics.quote_count ?? 0,
            postedAt: post.created_at ? new Date(post.created_at) : null,
          },
        });
      }
      postsAnalyzed = posts.length;
      postMetricsStatus = "AVAILABLE";
    }
    // If the posts call fails (e.g. no posts yet), we still save account-level stats below.

    await prisma.metricSnapshot.create({
      data: {
        connectedAccountId: connectedAccount.id,
        followersCount: accountMetrics.followers_count ?? 0,
        followingCount: accountMetrics.following_count ?? 0,
        postCount: accountMetrics.tweet_count ?? 0,
        totalLikes,
        totalViews,
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
        postMetricsStatus === "UNAVAILABLE"
          ? "Account metrics were updated, but recent post metrics were unavailable."
          : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
