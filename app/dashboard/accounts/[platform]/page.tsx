import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MetricsPanel from "@/components/dashboard/MetricsPanel";
import GrowthChart from "@/components/dashboard/GrowthChart";
import TopPost from "@/components/dashboard/TopPost";
import InsightsChat from "@/components/dashboard/InsightsChat";

function postUrl(platform: string, platformPostId: string): string {
  if (platform === "x") return `https://x.com/i/web/status/${platformPostId}`;
  if (platform === "facebook") return `https://www.facebook.com/${platformPostId}`;
  return "#";
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;
  const session = await auth();

  const connectedAccount = session?.user?.id
    ? await prisma.connectedAccount.findUnique({
        where: { userId_platform: { userId: session.user.id, platform } },
      })
    : null;

  if (!connectedAccount) {
    notFound();
  }

  const latestSnapshot = await prisma.metricSnapshot.findFirst({
    where: { connectedAccountId: connectedAccount.id },
    orderBy: { fetchedAt: "desc" },
  });

  const snapshotHistory = await prisma.metricSnapshot.findMany({
    where: { connectedAccountId: connectedAccount.id },
    orderBy: { fetchedAt: "asc" },
    take: 30,
  });

  const growthData = snapshotHistory.map((s) => ({
    date: s.fetchedAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    followers: s.followersCount,
  }));

  const topPost = await prisma.post.findFirst({
    where: { connectedAccountId: connectedAccount.id },
    orderBy: { likeCount: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-lg font-medium capitalize text-ink">
        {platform}
      </h1>
      <MetricsPanel
        platform={platform}
        snapshot={
          latestSnapshot
            ? {
                followersCount: latestSnapshot.followersCount,
                followingCount: latestSnapshot.followingCount,
                postCount: latestSnapshot.postCount,
                totalLikes: latestSnapshot.totalLikes,
                totalViews: latestSnapshot.totalViews,
                postsAnalyzed: latestSnapshot.postsAnalyzed,
                fetchedAt: latestSnapshot.fetchedAt.toISOString(),
              }
            : null
        }
      />
      <GrowthChart data={growthData} />
      <TopPost
        post={
          topPost
            ? {
                text: topPost.text,
                likeCount: topPost.likeCount,
                viewCount: topPost.viewCount,
                replyCount: topPost.replyCount,
                retweetCount: topPost.retweetCount,
                url: topPost.url ?? postUrl(platform, topPost.platformPostId),
              }
            : null
        }
      />
      <InsightsChat platform={platform} />
    </div>
  );
}

