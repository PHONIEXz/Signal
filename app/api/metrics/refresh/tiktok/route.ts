import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getValidTikTokAccessToken } from "@/lib/tiktok-token";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const connectedAccount = await prisma.connectedAccount.findUnique({
    where: { userId_platform: { userId: session.user.id, platform: "tiktok" } },
  });

  if (!connectedAccount) {
    return NextResponse.json({ error: "No TikTok account connected" }, { status: 404 });
  }

  try {
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

    let totalLikes = 0;
    let totalViews = 0;
    let postsAnalyzed = 0;

    const videosRes = await fetch(
      "https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,share_url,like_count,comment_count,share_count,view_count",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: 10 }),
      }
    );

    if (videosRes.ok) {
      const videosData = await videosRes.json();
      const videos: Array<{
        id: string;
        title?: string;
        video_description?: string;
        create_time?: number;
        share_url?: string;
        like_count?: number;
        comment_count?: number;
        share_count?: number;
        view_count?: number;
      }> = videosData.data?.videos ?? [];

      for (const video of videos) {
        const likeCount = video.like_count ?? 0;
        const viewCount = video.view_count ?? 0;
        totalLikes += likeCount;
        totalViews += viewCount;

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
    }

    await prisma.metricSnapshot.create({
      data: {
        connectedAccountId: connectedAccount.id,
        followersCount: user.follower_count ?? 0,
        followingCount: user.following_count ?? 0,
        postCount: user.video_count ?? 0,
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

