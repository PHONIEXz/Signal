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
      <section className="dashboard-hero animate-reveal relative isolate overflow-hidden rounded-[1.75rem] bg-[#102f4d] px-5 py-6 text-white shadow-[0_28px_80px_-42px_rgba(16,47,77,0.9)] sm:px-8 sm:py-8">
        <div className="dashboard-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#4f9ac8]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-60 w-60 rounded-full bg-amber/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-connected animate-pulse-dot" />
              {connections.length} connected {connections.length === 1 ? "signal" : "signals"}
            </div>
            <h1 className="mt-5 max-w-2xl font-display text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-[2.7rem]">
              See the full shape of your audience.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
              Your platforms, performance and next moves in one focused workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/content" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#102f4d] shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-white/90">
                Create content <span aria-hidden="true">+</span>
              </Link>
              <Link href="/dashboard/reports" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.07] px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/[0.12]">
                Open reports <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
          <svg viewBox="0 0 240 96" className="hidden h-24 w-60 overflow-visible lg:block" fill="none" aria-hidden="true">
            <path d="M4 60c24 0 24-35 48-35s24 49 48 49 24-64 48-64 24 39 44 39 20-17 44-17" stroke="rgb(255 255 255 / .16)" strokeWidth="14" strokeLinecap="round" />
            <path d="M4 60c24 0 24-35 48-35s24 49 48 49 24-64 48-64 24 39 44 39 20-17 44-17" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <circle cx="236" cy="32" r="6" fill="var(--color-amber)" />
          </svg>
        </div>
      </section>

      <div className="animate-reveal [animation-delay:80ms]">
        <PostSampleSelector plan={plan} selected={sampleSize} />
      </div>

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

      <section className="grid animate-reveal grid-cols-2 gap-3 [animation-delay:280ms] lg:grid-cols-4">
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

      <section className="surface-card animate-reveal overflow-hidden p-5 [animation-delay:340ms] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-lg font-medium text-ink">
              Reach snapshot
            </p>

            <p className="mt-1 text-sm text-ink-muted">
              Combined views across your latest available snapshots.
            </p>
          </div>

          <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink">
            {totalViews.knownCount} of {connections.length} platforms
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
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
      <p className="relative font-display text-2xl font-semibold tracking-[-0.035em] text-ink sm:text-3xl">
        {value === null ? "Unavailable" : value.toLocaleString()}
      </p>

      <p className="relative mt-3 text-xs font-medium text-ink-muted">
        {label}
      </p>
      {note && <p className="mt-1 text-[11px] text-amber-600">{note}</p>}
    </div>
  );
}
