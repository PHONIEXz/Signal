import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

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
    const accessToken = decrypt(connectedAccount.accessToken);
    const pageId = connectedAccount.platformUserId;

    const pageRes = await fetch(
      `https://graph.facebook.com/v25.0/${pageId}?fields=followers_count&access_token=${accessToken}`
    );
    if (!pageRes.ok) {
      return NextResponse.json({ error: "Facebook API request failed" }, { status: 502 });
    }
    const pageData = await pageRes.json();

    let totalLikes = 0;
    let postsAnalyzed = 0;

    const postsRes = await fetch(
      `https://graph.facebook.com/v25.0/${pageId}/posts?fields=message,created_time,reactions.summary(total_count),comments.summary(total_count),shares&limit=10&access_token=${accessToken}`
    );

    if (postsRes.ok) {
      const postsData = await postsRes.json();
      const posts: Array<{
        id: string;
        message?: string;
        created_time?: string;
        reactions?: { summary?: { total_count?: number } };
        comments?: { summary?: { total_count?: number } };
        shares?: { count?: number };
      }> = postsData.data ?? [];

      for (const post of posts) {
        const likeCount = post.reactions?.summary?.total_count ?? 0;
        const replyCount = post.comments?.summary?.total_count ?? 0;
        const retweetCount = post.shares?.count ?? 0;
        totalLikes += likeCount;

        await prisma.post.upsert({
          where: {
            connectedAccountId_platformPostId: {
              connectedAccountId: connectedAccount.id,
              platformPostId: post.id,
            },
          },
          update: {
            text: post.message ?? "(No text)",
            likeCount,
            replyCount,
            retweetCount,
            postedAt: post.created_time ? new Date(post.created_time) : null,
          },
          create: {
            connectedAccountId: connectedAccount.id,
            platformPostId: post.id,
            text: post.message ?? "(No text)",
            likeCount,
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
        followersCount: pageData.followers_count ?? 0,
        followingCount: 0,
        postCount: postsAnalyzed,
        totalLikes,
        totalViews: 0,
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

