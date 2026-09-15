import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { normalizeSampleSize } from "@/lib/metrics";
import {
  facebookApiErrorCode,
  facebookPostsWarning,
  type FacebookPostPayload,
  normalizeFacebookPost,
} from "@/lib/platform-data";

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

    const postsUrl = new URL(
      `https://graph.facebook.com/v26.0/${pageId}/posts`
    );
    postsUrl.searchParams.set(
      "fields",
      "message,created_time,permalink_url,reactions.summary(total_count),comments.summary(total_count),shares"
    );
    postsUrl.searchParams.set("limit", String(postLimit));

    const postsRes = await fetch(postsUrl, facebookRequest);

    if (postsRes.ok) {
      const postsData = await postsRes.json();
      const posts: FacebookPostPayload[] = postsData.data ?? [];

      totalLikes = 0;
      totalEngagements = 0;

      for (const post of posts) {
        const normalized = normalizeFacebookPost(post);
        totalLikes += normalized.likeCount;
        totalEngagements += normalized.engagementCount;

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
            likeCount: normalized.likeCount,
            replyCount: normalized.replyCount,
            retweetCount: normalized.shareCount,
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
      postMetricsStatus = "PARTIAL";
    } else {
      const errorPayload = await postsRes.json().catch(() => null);
      const errorCode = facebookApiErrorCode(errorPayload);
      postsWarning = facebookPostsWarning(errorCode);
      console.warn("Facebook Page posts unavailable", {
        status: postsRes.status,
        code: errorCode,
      });
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
        postMetricsStatus === "UNAVAILABLE"
          ? postsWarning
          : "Facebook views and total post count are not available from this connection.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
