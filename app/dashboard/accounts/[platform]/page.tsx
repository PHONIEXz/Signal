import YouTubeMetrics from "@/components/dashboard/YouTubeMetrics";
import { postEngagement } from "@/lib/metric-measurements";
import SyncDetails from "@/components/dashboard/SyncDetails";
import AccountAIAnalysis from "@/components/dashboard/AccountAIAnalysis";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import MetricsPanel from "@/components/dashboard/MetricsPanel";
import GrowthChart from "@/components/dashboard/GrowthChart";
import TopPost from "@/components/dashboard/TopPost";
import InsightsChat from "@/components/dashboard/InsightsChat";
import { normalizePlan, normalizeSampleSize, summarizePosts } from "@/lib/metrics";

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

  if(platform==="youtube") return <div className="mx-auto max-w-3xl"><YouTubeMetrics /></div>;

  const plan = normalizePlan(connectedAccount.user.plan);
  const sampleSize = normalizeSampleSize(query.posts, plan);

  const recentSnapshotHistory = await prisma.metricSnapshot.findMany({
    where: { connectedAccountId: connectedAccount.id, sampleSize },
    orderBy: { fetchedAt: "desc" },
    take: 30,
  });
  const snapshotHistory = recentSnapshotHistory.reverse();
  // Keep a useful saved view when this exact sample has not been collected.
  // This fallback is display-only: never add another sample to growth history.
  const latestSnapshot = snapshotHistory.at(-1) ?? await prisma.metricSnapshot.findFirst({
    where: { connectedAccountId: connectedAccount.id, postMetricsStatus: { not: "LEGACY" } },
    orderBy: { fetchedAt: "desc" },
  });
  const latestPageMediaView = platform === "facebook"
    ? await prisma.pageInsight.findFirst({
        where: {
          connectedAccountId: connectedAccount.id,
          metric: "page_media_view",
        },
        orderBy: { periodEnd: "desc" },
      })
    : null;

  const growthData = snapshotHistory.map((s) => ({
    date: s.fetchedAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    followers: s.followersCount,
    likes: s.postMetricsStatus === "LEGACY" ? null : s.totalLikes,
    views: s.postMetricsStatus === "LEGACY" ? null : s.totalViews,
    posts: s.postCount,
  }));

  const sampledPosts = await prisma.post.findMany({
    where: { connectedAccountId: connectedAccount.id },
    orderBy: { postedAt: "desc" },
    take: sampleSize,
  });
  const topPost = sampledPosts.filter(p => postEngagement(p) !== null).sort((a,b) => postEngagement(b)! - postEngagement(a)!)[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-lg font-medium capitalize text-ink">
        {platform}
      </h1>
      <MetricsPanel
        key={`${platform}-${sampleSize}`}
        platform={platform}
        plan={plan}
        sampleSize={sampleSize}
        pageMediaViews={latestPageMediaView?.value ?? null}
        postMetrics={summarizePosts(sampledPosts,platform)}
        postMeasuredAt={sampledPosts.length ? new Date(Math.max(...sampledPosts.map(p=>p.fetchedAt.getTime()))).toISOString() : null}
        snapshot={
          latestSnapshot
            ? {
                followersCount: latestSnapshot.followersCount,
                followingCount: latestSnapshot.followingCount,
                postCount: latestSnapshot.postCount,
                totalLikes: latestSnapshot.postMetricsStatus === "LEGACY" ? null : latestSnapshot.totalLikes,
                totalViews: latestSnapshot.postMetricsStatus === "LEGACY" ? null : latestSnapshot.totalViews,
                totalEngagements: latestSnapshot.postMetricsStatus === "LEGACY" ? null : latestSnapshot.totalEngagements,
                postsAnalyzed: latestSnapshot.postsAnalyzed,
                sampleSize: latestSnapshot.sampleSize,
                postMetricsStatus: latestSnapshot.postMetricsStatus,
                fetchedAt: latestSnapshot.fetchedAt.toISOString(),
              }
            : null
        }
      />
      <SyncDetails accountId={connectedAccount.id} />
      <GrowthChart data={growthData} platform={platform} />

      {platform!=="instagram" && <AccountAIAnalysis
        key={`${platform}-${sampleSize}`}
        platform={platform}
        sampleSize={sampleSize}
      />}

      {platform==="instagram" ? <section className="surface-card p-6"><h2 className="font-display text-lg font-semibold text-ink">Recent media</h2><p className="mt-1 text-xs text-ink-muted">Cumulative likes and comments. Insights such as reach and saves are not collected yet.</p><div className="mt-4 space-y-4">{sampledPosts.map(post=><div key={post.id} className="border-t border-border pt-3"><p className="text-sm text-ink">{post.text}</p><p className="mt-1 text-xs text-ink-muted">Likes: {post.likeCount?.toLocaleString()??"Unavailable"} · Comments: {post.replyCount?.toLocaleString()??"Unavailable"}</p>{post.url && <a className="text-xs text-navy underline" href={post.url} target="_blank" rel="noopener noreferrer">View on Instagram</a>}</div>)}</div></section> : <TopPost platform={platform}
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
      />}
      {platform!=="instagram" && <InsightsChat platform={platform} sampleSize={sampleSize} />}
    </div>
  );
}
