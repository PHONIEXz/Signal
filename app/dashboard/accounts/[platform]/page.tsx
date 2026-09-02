import AccountAIAnalysis from "@/components/dashboard/AccountAIAnalysis";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MetricsPanel from "@/components/dashboard/MetricsPanel";
import GrowthChart from "@/components/dashboard/GrowthChart";
import TopPost from "@/components/dashboard/TopPost";
import InsightsChat from "@/components/dashboard/InsightsChat";
import { normalizePlan, normalizeSampleSize } from "@/lib/metrics";

function postUrl(platform: string, platformPostId: string): string {
  if (platform === "x") return `https://x.com/i/web/status/${platformPostId}`;
  if (platform === "facebook") return `https://www.facebook.com/${platformPostId}`;
  return "#";
}

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ platform: string }>;
  searchParams: Promise<{ posts?: string }>;
}) {
  const { platform } = await params;
  const query = await searchParams;
  const session = await auth();

  const connectedAccount = session?.user?.id
      ? await prisma.connectedAccount.findUnique({
        where: { userId_platform: { userId: session.user.id, platform } },
        include: { user: { select: { plan: true } } },
      })
    : null;

  if (!connectedAccount) {
    notFound();
  }

  const plan = normalizePlan(connectedAccount.user.plan);
  const sampleSize = normalizeSampleSize(query.posts, plan);

  const recentSnapshotHistory = await prisma.metricSnapshot.findMany({
    where: { connectedAccountId: connectedAccount.id, sampleSize },
    orderBy: { fetchedAt: "desc" },
    take: 30,
  });
  const snapshotHistory = recentSnapshotHistory.reverse();
  const latestSnapshot = snapshotHistory.at(-1) ?? null;

  const growthData = snapshotHistory.map((s) => ({
    date: s.fetchedAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    followers: s.followersCount,
    likes: s.totalLikes,
    views: s.totalViews,
    posts: s.postCount,
  }));

  const sampledPosts = await prisma.post.findMany({
    where: { connectedAccountId: connectedAccount.id },
    orderBy: { postedAt: "desc" },
    take: sampleSize,
  });
  const topPost = sampledPosts.sort(
    (a, b) =>
      b.likeCount + b.replyCount + b.retweetCount + b.quoteCount -
      (a.likeCount + a.replyCount + a.retweetCount + a.quoteCount)
  )[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-lg font-medium capitalize text-ink">
        {platform}
      </h1>
      <MetricsPanel
        platform={platform}
        plan={plan}
        sampleSize={sampleSize}
        snapshot={
          latestSnapshot
            ? {
                followersCount: latestSnapshot.followersCount,
                followingCount: latestSnapshot.followingCount,
                postCount: latestSnapshot.postCount,
                totalLikes: latestSnapshot.totalLikes,
                totalViews: latestSnapshot.totalViews,
                totalEngagements: latestSnapshot.totalEngagements,
                postsAnalyzed: latestSnapshot.postsAnalyzed,
                sampleSize: latestSnapshot.sampleSize,
                postMetricsStatus: latestSnapshot.postMetricsStatus,
                fetchedAt: latestSnapshot.fetchedAt.toISOString(),
              }
            : null
        }
      />
      <GrowthChart data={growthData} />

      <AccountAIAnalysis
        key={`${platform}-${sampleSize}`}
        platform={platform}
        sampleSize={sampleSize}
      />

      <TopPost
        post={
          topPost
            ? {
                text: topPost.text,
                likeCount: topPost.likeCount,
                viewCount: platform === "facebook" ? null : topPost.viewCount,
                replyCount: topPost.replyCount,
                retweetCount: topPost.retweetCount,
                quoteCount: topPost.quoteCount,
                url: topPost.url ?? postUrl(platform, topPost.platformPostId),
              }
            : null
        }
      />
      <InsightsChat platform={platform} sampleSize={sampleSize} />
    </div>
  );
}
