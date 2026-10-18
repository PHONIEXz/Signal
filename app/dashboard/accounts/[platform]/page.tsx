import BackToTop from "@/components/dashboard/BackToTop";
import { postEngagement } from "@/lib/metric-measurements";
import SyncDetails from "@/components/dashboard/SyncDetails";
import Link from "next/link";
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

  const plan = normalizePlan(connectedAccount.user.plan);
  const sampleSize = normalizeSampleSize(query.posts, plan);

  const recentSnapshotHistory = await prisma.metricSnapshot.findMany({
    where: { connectedAccountId: connectedAccount.id },
    orderBy: { fetchedAt: "desc" },
    take: 5001,
    select: { fetchedAt: true, followersCount: true, followingCount: true, postCount: true, totalLikes: true, totalViews: true, totalEngagements: true, postsAnalyzed: true, sampleSize: true, postMetricsStatus: true },
  });
  const historyLimited = recentSnapshotHistory.length > 5000;
  const snapshotHistory = recentSnapshotHistory.slice(0, 5000).reverse();
  // Keep a useful saved view when this exact sample has not been collected.
  // This fallback is display-only: never add another sample to growth history.
  const sampleHistory = snapshotHistory.filter(snapshot => snapshot.sampleSize === sampleSize);
  const latestSnapshot = sampleHistory.at(-1) ?? await prisma.metricSnapshot.findFirst({
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
    date: s.fetchedAt.toISOString(),
    sampleSize: s.sampleSize,
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
      <h1 id="account-heading" tabIndex={-1} className="scroll-mt-24 font-display text-3xl font-bold capitalize tracking-tight text-ink focus:outline-none">
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
      <GrowthChart asOf={new Date().toISOString()} sampleData={growthData.filter(point => point.sampleSize === sampleSize)} data={growthData} platform={platform} historyLimited={historyLimited} />

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-surface p-6">
        <div><h2 className="text-lg font-bold text-ink">Want a deeper analysis?</h2><p className="mt-1 text-sm text-ink-muted">Explore opportunities and next actions in Reports, when you need them.</p></div>
        <Link href={`/dashboard/reports?account=${encodeURIComponent(connectedAccount.id)}&posts=${sampleSize}`} className="inline-flex min-h-11 items-center rounded-xl bg-action px-5 text-sm font-semibold text-white">View account report <span aria-hidden="true" className="ml-2">↗</span></Link>
      </section>

      <TopPost platform={platform}
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
      <BackToTop />
      <InsightsChat key={platform} platform={platform} sampleSize={sampleSize} />
    </div>
  );
}
