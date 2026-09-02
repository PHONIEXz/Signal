import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getValidTikTokAccessToken } from "@/lib/tiktok-token";
import { normalizeSampleSize } from "@/lib/metrics";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const connectedAccount = await prisma.connectedAccount.findUnique({
    where: { userId_platform: { userId: session.user.id, platform: "tiktok" } },
    include: { user: { select: { plan: true } } },
  });

  if (!connectedAccount) {
    return NextResponse.json({ error: "No TikTok account connected" }, { status: 404 });
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

    const accessToken = await getValidTikTokAccessToken(connectedAccount.id);

    const userRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,follower_count,following_count,likes_count,video_count",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!userRes.ok) {
      return NextResponse.json({ error: "TikTok API request failed" }, { status: 502 });
    }

    const userData = await userRes.json();
    const user = userData.data?.user;

    if (!user) {
      return NextResponse.json({ error: "Unexpected response from TikTok" }, { status: 502 });
    }

    let totalLikes: number | null = null;
    let totalViews: number | null = null;
    let totalEngagements: number | null = null;
    let postsAnalyzed = 0;
    let postMetricsStatus = "UNAVAILABLE";

    type TikTokVideo = {
        id: string;
        title?: string;
        video_description?: string;
        create_time?: number;
        share_url?: string;
        like_count?: number;
        comment_count?: number;
        share_count?: number;
        view_count?: number;
    };

    const videos: TikTokVideo[] = [];
    let cursor: number | undefined;
    let videoRequestSucceeded = true;

    while (videos.length < postLimit) {
      const videosRes = await fetch(
        "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,share_url,like_count,comment_count,share_count,view_count",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            max_count: Math.min(20, postLimit - videos.length),
            ...(cursor === undefined ? {} : { cursor }),
          }),
        }
      );

      if (!videosRes.ok) {
        videoRequestSucceeded = false;
        break;
      }

      const videosData = await videosRes.json();
      const page: TikTokVideo[] = videosData.data?.videos ?? [];
      videos.push(...page);

      if (!videosData.data?.has_more || page.length === 0) break;
      cursor = videosData.data.cursor;
    }

    if (videoRequestSucceeded) {
      totalLikes = 0;
      totalViews = 0;
      totalEngagements = 0;

      for (const video of videos) {
        const likeCount = video.like_count ?? 0;
        const viewCount = video.view_count ?? 0;
        totalLikes += likeCount;
        totalViews += viewCount;
        totalEngagements +=
          likeCount + (video.comment_count ?? 0) + (video.share_count ?? 0);

        await prisma.post.upsert({
          where: {
            connectedAccountId_platformPostId: {
              connectedAccountId: connectedAccount.id,
              platformPostId: video.id,
            },
          },
          update: {
            text: video.video_description || video.title || "(No caption)",
            url: video.share_url ?? null,
            likeCount,
            viewCount,
            replyCount: video.comment_count ?? 0,
            retweetCount: video.share_count ?? 0,
            postedAt: video.create_time ? new Date(video.create_time * 1000) : null,
          },
          create: {
            connectedAccountId: connectedAccount.id,
            platformPostId: video.id,
            text: video.video_description || video.title || "(No caption)",
            url: video.share_url ?? null,
            likeCount,
            viewCount,
            replyCount: video.comment_count ?? 0,
            retweetCount: video.share_count ?? 0,
            postedAt: video.create_time ? new Date(video.create_time * 1000) : null,
          },
        });
      }
      postsAnalyzed = videos.length;
      postMetricsStatus = "AVAILABLE";
    }

    await prisma.metricSnapshot.create({
      data: {
        connectedAccountId: connectedAccount.id,
        followersCount: user.follower_count ?? 0,
        followingCount: user.following_count ?? 0,
        postCount: user.video_count ?? 0,
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
          ? "Account metrics were updated, but recent video metrics were unavailable."
          : null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
