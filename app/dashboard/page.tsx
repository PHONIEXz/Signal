import EmptyState from "@/components/dashboard/EmptyState";
import AccountCard from "@/components/dashboard/AccountCard";
import SignalScore from "@/components/dashboard/SignalScore";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PostSampleSelector from "@/components/dashboard/PostSampleSelector";
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
    followers: connection.metricSnapshots[0]?.followersCount ?? null,
    snapshot: connection.metricSnapshots[0] ?? null,
    previousSnapshot: connection.metricSnapshots[1] ?? null,
    postMetrics: summarizePosts(connection.posts, connection.platform),
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
  const followersForRate = viewEligible.reduce(
    (sum, account) => sum + (account.followers ?? 0),
    0
  );
  const postsForRate = viewEligible.reduce(
    (sum, account) => sum + account.postMetrics.postsAnalyzed,
    0
  );
  const engagementRate = calculateEngagementRate(
    viewEligible.length ? engagementsForRate : null,
    totalViews.value
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
      account.snapshot && account.snapshot.postMetricsStatus !== "UNAVAILABLE"
  );
  const averageViewsPerPost =
    totalViews.value !== null && postsForRate > 0
      ? totalViews.value / postsForRate
      : null;
  const score = calculateSignalScore({
    engagementRate,
    followerGrowthRate,
    postsLast30Days: activityDataAvailable ? postsLast30Days : null,
    averageViewsPerPost,
    followers: viewEligible.length ? followersForRate : null,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy">
          Dashboard
        </p>

        <h1 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">
          Your signal
        </h1>

        <p className="mt-2 text-sm text-ink-muted">
          A quick view of how your connected platforms are performing.
        </p>
      </div>

      <PostSampleSelector plan={plan} selected={sampleSize} />

      <section>
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

        <div className="grid gap-3">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              id={account.id}
              platform={account.platform}
              followers={account.followers}
            />
          ))}
        </div>
      </section>

      <section>
        <SignalScore result={score} />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
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
          label={`Likes from selected last ${sampleSize}`}
          value={totalLikes.value}
          note={totalLikes.complete ? undefined : "Partial across connected platforms"}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
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
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-display text-2xl font-semibold text-ink">
        {value === null ? "Unavailable" : value.toLocaleString()}
      </p>

      <p className="mt-1 text-xs text-ink-muted">
        {label}
      </p>
      {note && <p className="mt-1 text-[11px] text-amber-600">{note}</p>}
    </div>
  );
}
