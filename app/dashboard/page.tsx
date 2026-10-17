import EmptyState from "@/components/dashboard/EmptyState";
import AccountCard from "@/components/dashboard/AccountCard";
import SignalScore from "@/components/dashboard/SignalScore";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PostSampleSelector from "@/components/dashboard/PostSampleSelector";
import Link from "next/link";
import {
  calculateChangePercent,
  calculateEngagementRate,
  calculateSignalScore,
  normalizePlan,
  normalizeSampleSize,
  sumAvailable,
  summarizePosts,
} from "@/lib/metrics";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ posts?: string }>;
}) {
  const session = await auth();
  const query = await searchParams;

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { plan: true },
      })
    : null;
  const plan = normalizePlan(user?.plan);
  const sampleSize = normalizeSampleSize(query.posts, plan);

  const connections = session?.user?.id
    ? await prisma.connectedAccount.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        include: {
          metricSnapshots: {
            orderBy: { fetchedAt: "desc" },
            take: 2,
          },
          posts: {
            orderBy: { postedAt: "desc" },
            take: sampleSize,
          },
        },
      })
    : [];

  if (connections.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState />
      </div>
    );
  }

  const accounts = connections.map((connection) => ({
    id: connection.id,
    platform: connection.platform,
    displayName: connection.displayName,
    followers: connection.metricSnapshots[0]?.followersCount ?? null,
    snapshot: connection.metricSnapshots[0] ?? null,
    previousSnapshot: connection.metricSnapshots[1] ?? null,
    postMetrics: summarizePosts(connection.metricSnapshots[0]?.postMetricsStatus === "CONTENT_ONLY" ? [] : connection.posts, connection.platform),
  }));

  const totalFollowers = sumAvailable(
    accounts.map((account) => account.followers)
  );

  const totalPosts = sumAvailable(
    accounts.map((account) => account.snapshot?.postCount ?? null)
  );
  const totalLikes = sumAvailable(
    accounts.map((account) => account.postMetrics.likes)
  );
  const viewEligible = accounts.filter(
    (account) =>
      account.postMetrics.views !== null &&
      account.postMetrics.engagements !== null
  );
  const totalViews = sumAvailable(
    accounts.map((account) => account.postMetrics.views)
  );
  const engagementsForRate = viewEligible.reduce(
    (sum, account) => sum + (account.postMetrics.engagements ?? 0),
    0
  );
  const followersForRate = viewEligible.some(account => account.followers === null) ? null : viewEligible.reduce(
    (sum, account) => sum + (account.followers ?? 0),
    0
  );
  const postsForRate = viewEligible.reduce(
    (sum, account) => sum + account.postMetrics.postsAnalyzed,
    0
  );
  const engagementRate = calculateEngagementRate(
    viewEligible.length ? engagementsForRate : null,
    viewEligible.length ? viewEligible.reduce((sum, account) => sum + account.postMetrics.views!, 0) : null
  );

  const pairedSnapshots = accounts.filter(
    (account) => account.snapshot && account.previousSnapshot
  );
  const pairedCurrentFollowers = pairedSnapshots.reduce(
    (sum, account) => sum + account.snapshot!.followersCount,
    0
  );
  const pairedPreviousFollowers = pairedSnapshots.reduce(
    (sum, account) => sum + account.previousSnapshot!.followersCount,
    0
  );
  const followerGrowthRate = pairedSnapshots.length
    ? calculateChangePercent(pairedCurrentFollowers, pairedPreviousFollowers)
    : null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const postsLast30Days = session?.user?.id
    ? await prisma.post.count({
        where: {
          connectedAccount: { userId: session.user.id },
          postedAt: { gte: thirtyDaysAgo },
        },
      })
    : 0;
  const activityDataAvailable = accounts.every(
    (account) =>
      account.snapshot && !["UNAVAILABLE", "CONTENT_ONLY", "EMPTY", "LEGACY"].includes(account.snapshot.postMetricsStatus)
  );
  const averageViewsPerPost =
    viewEligible.length && postsForRate > 0
      ? viewEligible.reduce((sum, account) => sum + account.postMetrics.views!, 0) / postsForRate
      : null;
  const score = calculateSignalScore({
    engagementRate,
    followerGrowthRate,
    postsLast30Days: activityDataAvailable ? postsLast30Days : null,
    averageViewsPerPost,
    followers: viewEligible.length ? followersForRate : null,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="section-kicker">Your workspace at a glance</p><h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.045em] text-ink">Overview<span className="text-navy">.</span></h1><p className="mt-3 text-sm text-ink-muted">{connections.length} connected {connections.length === 1 ? "account" : "accounts"}. A clearer view of what comes next.</p></div>
        <Link href="/dashboard/content" className="pill-link self-start bg-action text-white hover:bg-action-hover sm:self-auto">Create content <span aria-hidden="true">+</span></Link>
      </section>

      <div className="animate-reveal [animation-delay:80ms]">
        <PostSampleSelector plan={plan} selected={sampleSize} />
      </div>

      <section className="grid animate-reveal grid-cols-1 gap-3 min-[380px]:grid-cols-2 [animation-delay:280ms] lg:grid-cols-4">
        <SummaryCard
          label="Total followers"
          value={totalFollowers.value}
          note={totalFollowers.complete ? undefined : "Partial across connected platforms"}
        />

        <SummaryCard
          label="Account posts"
          value={totalPosts.value}
          note={totalPosts.complete ? undefined : "Partial across connected platforms"}
        />

        <SummaryCard
          label={`Likes/reactions from selected last ${sampleSize}`}
          value={totalLikes.value}
          note={totalLikes.complete ? undefined : "Partial across connected platforms"}
        />
        <SummaryCard
          label={`Views from selected last ${sampleSize}`}
          value={totalViews.value}
          note={totalViews.complete ? undefined : "Partial across connected platforms"}
        />
      </section>

      <section className="animate-reveal [animation-delay:160ms]">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-medium text-ink">
              Connected accounts
            </h2>

            <p className="mt-1 text-sm text-ink-muted">
              {connections.length} platform
              {connections.length === 1 ? "" : "s"} connected
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              id={account.id}
              platform={account.platform}
              displayName={account.displayName}
              followers={account.followers}
            />
          ))}
        </div>
      </section>

      <section className="animate-reveal [animation-delay:220ms]">
        <SignalScore result={score} />
      </section>

      <section className="surface-card animate-reveal overflow-hidden p-5 [animation-delay:340ms] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-lg font-medium text-ink">
              Reach snapshot
            </p>

            <p className="mt-1 text-sm text-ink-muted">
              Views from the selected post samples, with platform coverage shown.
            </p>
          </div>

          <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink">
            {totalViews.knownCount} of {connections.length} platforms
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-3xl font-semibold text-ink">
              {totalViews.value === null ? "Unavailable" : totalViews.value.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-ink-muted">
              views from selected post samples
            </p>
            {!totalViews.complete && totalViews.value !== null && (
              <p className="mt-1 text-[11px] text-amber-600">
                Partial total because some platforms do not provide views
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="font-display text-xl font-medium text-ink">
              {engagementRate === null ? "Unavailable" : `${engagementRate.toFixed(1)}%`}
            </p>

            <p className="mt-1 text-xs text-ink-muted">
              interactions / views
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number | null;
  note?: string;
}) {
  return (
    <div className="surface-card group relative min-h-32 overflow-hidden p-4 sm:p-5">
      <div className="absolute -right-9 -top-9 h-24 w-24 rounded-full bg-navy/[0.05] transition-transform duration-500 group-hover:scale-125" />
      <p className="relative break-words font-display text-xl font-bold tracking-[-0.035em] text-ink sm:text-3xl">
        {value === null ? "Unavailable" : value.toLocaleString()}
      </p>

      <p className="relative mt-3 text-xs font-medium text-ink-muted">
        {label}
      </p>
      {note && <p className="mt-1 text-[11px] text-amber-600">{note}</p>}
    </div>
  );
}
