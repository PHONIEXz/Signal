import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

const GRAPH_VERSION = "v25.0";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const connectedAccount = await prisma.connectedAccount.findUnique({
    where: { userId_platform: { userId: session.user.id, platform: "facebook" } },
  });

  if (!connectedAccount || !connectedAccount.platformUserId) {
    return NextResponse.json({ error: "No Facebook Page connected" }, { status: 404 });
  }

  try {
    const pageToken = decrypt(connectedAccount.accessToken);
    const pageId = connectedAccount.platformUserId;

    // Step 1: page-level follower count
    const pageRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}?fields=followers_count,fan_count&access_token=${pageToken}`
    );

    if (!pageRes.ok) {
      return NextResponse.json({ error: "Facebook API request failed" }, { status: 502 });
    }

    const pageData = await pageRes.json();
    const followersCount = pageData.followers_count ?? pageData.fan_count ?? 0;

    // Step 2: recent posts with engagement
    let totalLikes = 0;
    let totalViews = 0;
    let postsAnalyzed = 0;

    const postsRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/posts?fields=message,created_time,likes.summary(true),comments.summary(true),shares&limit=10&access_token=${pageToken}`
    );

    if (postsRes.ok) {
      const postsData = await postsRes.json();
      const posts: Array<{
        id: string;
        message?: string;
        created_time?: string;
        likes?: { summary?: { total_count?: number } };
        comments?: { summary?: { total_count?: number } };
        shares?: { count?: number };
      }> = postsData.data ?? [];

      for (const post of posts) {
        const likeCount = post.likes?.summary?.total_count ?? 0;
        const replyCount = post.comments?.summary?.total_count ?? 0;
        const retweetCount = post.shares?.count ?? 0;

        // Post-level impressions need a separate Insights call; best-effort.
        let viewCount = 0;
        try {
          const insightsRes = await fetch(
            `https://graph.facebook.com/${GRAPH_VERSION}/${post.id}/insights?metric=post_impressions&access_token=${pageToken}`
          );
          if (insightsRes.ok) {
            const insightsData = await insightsRes.json();
            viewCount = insightsData.data?.[0]?.values?.[0]?.value ?? 0;
          }
        } catch {
          // skip impressions on failure, rest of the refresh still succeeds
        }

        totalLikes += likeCount;
        totalViews += viewCount;

        await prisma.post.upsert({
          where: {
            connectedAccountId_platformPostId: {
              connectedAccountId: connectedAccount.id,
              platformPostId: post.id,
            },
          },
          update: {
            text: post.message ?? "",
            likeCount,
            viewCount,
            replyCount,
            retweetCount,
            postedAt: post.created_time ? new Date(post.created_time) : null,
          },
          create: {
            connectedAccountId: connectedAccount.id,
            platformPostId: post.id,
            text: post.message ?? "",
            likeCount,
            viewCount,
            replyCount,
            retweetCount,
            postedAt: post.created_time ? new Date(post.created_time) : null,
          },
        });
      }
      postsAnalyzed = posts.length;
    }

    await prisma.metricSnapshot.create({
      data: {
        connectedAccountId: connectedAccount.id,
        followersCount,
        followingCount: 0,
        postCount: postsAnalyzed,
        totalLikes,
        totalViews,
        postsAnalyzed,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

