import EmptyState from "@/components/dashboard/EmptyState";
import AccountCard from "@/components/dashboard/AccountCard";
import SignalScore from "@/components/dashboard/SignalScore";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();

  const connections = session?.user?.id
    ? await prisma.connectedAccount.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        include: {
          metricSnapshots: {
            orderBy: { fetchedAt: "desc" },
            take: 1,
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
  }));

  const snapshots = accounts
    .map((account) => account.snapshot)
    .filter(Boolean);

  const totalFollowers = snapshots.reduce(
    (sum, snapshot) => sum + (snapshot?.followersCount ?? 0),
    0
  );

  const totalPosts = snapshots.reduce(
    (sum, snapshot) => sum + (snapshot?.postCount ?? 0),
    0
  );

  const totalLikes = snapshots.reduce(
    (sum, snapshot) => sum + (snapshot?.totalLikes ?? 0),
    0
  );

  const totalViews = snapshots.reduce(
    (sum, snapshot) => sum + (snapshot?.totalViews ?? 0),
    0
  );

  const engagementRate =
    totalViews > 0
      ? (totalLikes / totalViews) * 100
      : 0;

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
        <SignalScore
          followers={totalFollowers}
          posts={totalPosts}
          likes={totalLikes}
          views={totalViews}
          engagementRate={engagementRate}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Total followers"
          value={totalFollowers}
        />

        <SummaryCard
          label="Total posts"
          value={totalPosts}
        />

        <SummaryCard
          label="Total likes"
          value={totalLikes}
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
            {connections.length} platforms
          </span>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="font-display text-3xl font-semibold text-ink">
              {totalViews.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-ink-muted">
              total views
            </p>
          </div>

          <div className="text-right">
            <p className="font-display text-xl font-medium text-ink">
              {engagementRate.toFixed(1)}%
            </p>

            <p className="mt-1 text-xs text-ink-muted">
              likes / views
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
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-display text-2xl font-semibold text-ink">
        {value.toLocaleString()}
      </p>

      <p className="mt-1 text-xs text-ink-muted">
        {label}
      </p>
    </div>
  );
}
