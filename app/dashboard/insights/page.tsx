import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Snapshot = {
  followersCount: number;
  followingCount: number;
  postCount: number;
  totalLikes: number;
  totalViews: number;
  postsAnalyzed: number;
  fetchedAt: Date;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function platformName(platform: string) {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

function getGrowth(current: number, previous?: number | null) {
  if (previous === undefined || previous === null) return null;
  return current - previous;
}

function getEngagement(snapshot: Snapshot) {
  if (snapshot.followersCount <= 0) return 0;

  const interactions = snapshot.totalLikes + snapshot.totalViews;

  return (interactions / snapshot.followersCount) * 100;
}

export default async function InsightsPage() {
  const session = await auth();

  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-border bg-surface p-8">
          <h1 className="font-display text-xl font-medium text-ink">
            Signal AI
          </h1>

          <p className="mt-2 text-sm text-ink-muted">
            Sign in to see your personalized insights.
          </p>
        </div>
      </div>
    );
  }

  const connections = await prisma.connectedAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      metricSnapshots: {
        orderBy: { fetchedAt: "desc" },
        take: 2,
      },
      posts: {
        orderBy: { postedAt: "desc" },
        take: 10,
      },
    },
  });

  if (connections.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader />

        <div className="rounded-xl border border-border bg-surface p-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy/10 text-lg text-navy">
            ✦
          </div>

          <h2 className="mt-5 font-display text-lg font-medium text-ink">
            Connect an account to unlock insights
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
            Signal needs account performance data before it can identify
            growth patterns, content opportunities and changes in your
            audience.
          </p>

          <Link
            href="/dashboard/accounts"
            className="mt-5 inline-flex rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Connect an account
          </Link>
        </div>
      </div>
    );
  }

  const allSnapshots = connections.flatMap((connection) =>
    connection.metricSnapshots.map((snapshot) => ({
      ...snapshot,
      platform: connection.platform,
    }))
  );

  const currentSnapshots = connections
    .map((connection) => connection.metricSnapshots[0])
    .filter(Boolean) as Snapshot[];

  const previousSnapshots = connections
    .map((connection) => connection.metricSnapshots[1])
    .filter(Boolean) as Snapshot[];

  const totalFollowers = currentSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.followersCount,
    0
  );

  const totalFollowing = currentSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.followingCount,
    0
  );

  const totalPosts = currentSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.postCount,
    0
  );

  const totalLikes = currentSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.totalLikes,
    0
  );

  const totalViews = currentSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.totalViews,
    0
  );

  const previousFollowers = previousSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.followersCount,
    0
  );

  const followerGrowth =
    previousSnapshots.length > 0
      ? totalFollowers - previousFollowers
      : null;

  const growthPositive = followerGrowth !== null && followerGrowth >= 0;

  const totalEngagement =
    totalFollowers > 0
      ? ((totalLikes + totalViews) / totalFollowers) * 100
      : 0;

  const analyzedPosts = connections.reduce(
    (sum, connection) => sum + connection.posts.length,
    0
  );

  const latestSnapshotDate = allSnapshots
    .map((snapshot) => snapshot.fetchedAt)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const strongestPlatform = connections
    .map((connection) => {
      const snapshot = connection.metricSnapshots[0];

      return {
        platform: connection.platform,
        followers: snapshot?.followersCount ?? 0,
        engagement: snapshot ? getEngagement(snapshot) : 0,
      };
    })
    .sort((a, b) => b.followers - a.followers)[0];

  const recentPosts = connections
    .flatMap((connection) =>
      connection.posts.map((post) => ({
        ...post,
        platform: connection.platform,
      }))
    )
    .sort((a, b) => {
      const aDate = a.postedAt?.getTime() ?? 0;
      const bDate = b.postedAt?.getTime() ?? 0;

      return bDate - aDate;
    })
    .slice(0, 5);

  const strongestPost = recentPosts
    .slice()
    .sort(
      (a, b) =>
        b.likeCount +
        b.replyCount +
        b.retweetCount -
        (a.likeCount + a.replyCount + a.retweetCount)
    )[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        latestSnapshotDate={latestSnapshotDate}
      />

      {/* Hero insight */}
      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border bg-paper px-6 py-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy/10 text-sm text-navy">
              ✦
            </span>

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy">
                Signal intelligence
              </p>

              <p className="mt-0.5 text-xs text-ink-muted">
                Based on your available account data
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-7">
          <h2 className="max-w-2xl font-display text-2xl font-medium tracking-tight text-ink">
            {followerGrowth === null
              ? "Your Signal profile is starting to take shape."
              : growthPositive
                ? `Your audience is moving in the right direction.`
                : `Your audience needs attention right now.`}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
            {followerGrowth === null
              ? "Signal has your current performance data, but it needs another snapshot before it can confidently compare growth over time."
              : growthPositive
                ? `You currently have ${formatNumber(
                    totalFollowers
                  )} followers across your connected platforms. Your latest available snapshots show a net change of ${formatNumber(
                    Math.abs(followerGrowth)
                  )} follower${Math.abs(followerGrowth) === 1 ? "" : "s"}.`
                : `Your latest snapshots show a decrease of ${formatNumber(
                    Math.abs(followerGrowth)
                  )} follower${Math.abs(followerGrowth) === 1 ? "" : "s"}. This is a good reason to look at your recent content and platform performance.`}
          </p>
        </div>
      </section>

      {/* Snapshot */}
      <section>
        <SectionHeading
          title="Your current signal"
          description="A quick read of the numbers Signal has available."
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Followers"
            value={formatNumber(totalFollowers)}
            change={
              followerGrowth !== null
                ? `${followerGrowth >= 0 ? "+" : ""}${formatNumber(
                    followerGrowth
                  )}`
                : "Waiting for history"
            }
          />

          <MetricCard
            label="Following"
            value={formatNumber(totalFollowing)}
          />

          <MetricCard
            label="Posts"
            value={formatNumber(totalPosts)}
          />

          <MetricCard
            label="Engagement signal"
            value={`${totalEngagement.toFixed(1)}%`}
          />
        </div>
      </section>

      {/* What changed */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <SectionHeading
          title="What changed?"
          description="The most useful differences Signal can identify right now."
        />

        <div className="mt-6 space-y-5">
          <InsightRow
            icon={growthPositive ? "↑" : "↓"}
            title={
              followerGrowth === null
                ? "Growth history is building"
                : growthPositive
                  ? "Audience growth is positive"
                  : "Audience growth is negative"
            }
            description={
              followerGrowth === null
                ? "Once another metric snapshot is available, Signal can calculate a meaningful growth trend."
                : `${formatNumber(
                    Math.abs(followerGrowth)
                  )} follower${Math.abs(followerGrowth) === 1 ? "" : "s"} ${
                    growthPositive ? "were added" : "were lost"
                  } between the latest available snapshots.`
            }
            tone={growthPositive ? "positive" : "attention"}
          />

          <InsightRow
            icon="◎"
            title={`${platformName(
              strongestPlatform?.platform ?? "your strongest platform"
            )} currently leads`}
            description={
              strongestPlatform
                ? `${formatNumber(
                    strongestPlatform.followers
                  )} followers are currently associated with this connected platform.`
                : "Connect a platform with metric data to identify your strongest channel."
            }
            tone="neutral"
          />

          <InsightRow
            icon="◌"
            title={
              analyzedPosts > 0
                ? `${analyzedPosts} stored posts are available for analysis`
                : "Post-level analysis is waiting"
            }
            description={
              analyzedPosts > 0
                ? "Signal can use these stored posts for content-level insights. New X posts may remain unavailable until your X API access is restored."
                : "Your account metrics are available, but there are not enough stored posts yet for content-level analysis."
            }
            tone="neutral"
          />
        </div>
      </section>

      {/* Recommendations */}
      <section>
        <SectionHeading
          title="What should you do next?"
          description="Practical actions based on the data Signal currently has."
        />

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Recommendation
            number="01"
            title="Keep measuring"
            description="Refresh your account metrics regularly so Signal can build a stronger growth history."
          />

          <Recommendation
            number="02"
            title="Study your strongest content"
            description={
              strongestPost
                ? `Your strongest stored post currently has ${strongestPost.likeCount} likes, ${strongestPost.replyCount} replies and ${strongestPost.retweetCount} reposts.`
                : "Once posts are stored, Signal can identify which content deserves to be repeated."
            }
          />

          <Recommendation
            number="03"
            title="Compare platforms"
            description="Use Reports to see which connected platform is contributing most to your overall audience."
          />
        </div>
      </section>

      {/* Supporting data */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <SectionHeading
            title="Supporting data"
            description="Go deeper into the numbers behind these insights."
          />

          <Link
            href="/dashboard/reports"
            className="shrink-0 text-xs font-medium text-ink underline underline-offset-4"
          >
            View reports →
          </Link>
        </div>

        <div className="mt-6 divide-y divide-border">
          {connections.map((connection) => {
            const snapshot = connection.metricSnapshots[0];

            return (
              <div
                key={connection.id}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-connected" />

                  <div>
                    <p className="text-sm font-medium text-ink">
                      {platformName(connection.platform)}
                    </p>

                    <p className="mt-0.5 text-xs text-ink-muted">
                      {snapshot
                        ? `Updated ${snapshot.fetchedAt.toLocaleDateString()}`
                        : "No metric snapshot yet"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium text-ink">
                    {formatNumber(snapshot?.followersCount ?? 0)}
                  </p>

                  <p className="text-xs text-ink-muted">
                    followers
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PageHeader({
  latestSnapshotDate,
}: {
  latestSnapshotDate?: Date;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-lg text-navy">✦</span>

        <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy">
          Signal AI
        </p>
      </div>

      <h1 className="mt-2 font-display text-2xl font-medium tracking-tight text-ink">
        Your social intelligence
      </h1>

      <p className="mt-1 text-sm text-ink-muted">
        Understand what is happening, why it matters, and what to do next.
      </p>

      {latestSnapshotDate && (
        <p className="mt-2 text-xs text-ink-muted">
          Latest data: {latestSnapshotDate.toLocaleString()}
        </p>
      )}
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="font-display text-lg font-medium text-ink">
        {title}
      </h2>

      <p className="mt-1 text-xs leading-5 text-ink-muted">
        {description}
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-xs text-ink-muted">
        {label}
      </p>

      <p className="mt-2 font-display text-xl font-medium text-ink">
        {value}
      </p>

      {change && (
        <p className="mt-1 text-[11px] text-ink-muted">
          {change}
        </p>
      )}
    </div>
  );
}

function InsightRow({
  icon,
  title,
  description,
  tone,
}: {
  icon: string;
  title: string;
  description: string;
  tone: "positive" | "attention" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "bg-connected/10 text-connected"
      : tone === "attention"
        ? "bg-amber-500/10 text-amber-600"
        : "bg-navy/10 text-navy";

  return (
    <div className="flex gap-4">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${toneClass}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-sm font-medium text-ink">
          {title}
        </p>

        <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-muted">
          {description}
        </p>
      </div>
    </div>
  );
}

function Recommendation({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <span className="text-[10px] font-medium tracking-[0.15em] text-navy">
        {number}
      </span>

      <h3 className="mt-3 text-sm font-medium text-ink">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-ink-muted">
        {description}
      </p>
    </div>
  );
}
