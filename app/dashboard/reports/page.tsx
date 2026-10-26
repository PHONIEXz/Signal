import PerformanceSnapshot from "@/components/dashboard/PerformanceSnapshot";
import { performanceSnapshot } from "@/lib/performance-snapshot";
import ReportAccountSelector from "@/components/dashboard/ReportAccountSelector";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import SignalReport from "@/components/dashboard/SignalReport";
import PostSampleSelector from "@/components/dashboard/PostSampleSelector";
import { normalizePlan, normalizeSampleSize } from "@/lib/metrics";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ posts?: string; account?: string }>;
}) {
  const session = await auth();
  const query = await searchParams;

  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="workspace-panel rounded-xl border border-border bg-surface p-8">
          <h1 className="font-display text-xl font-medium text-ink">
            Reports
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Sign in to view your SocialPanora AI report.
          </p>
        </div>
      </div>
    );
  }

  const [user, connections] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    }),
    prisma.connectedAccount.findMany({
      where: { userId: session.user.id },
      select: { id: true, platform: true, displayName: true,
        metricSnapshots: { orderBy: { fetchedAt: "desc" }, take: 90, select: { fetchedAt: true, followersCount: true, postCount: true, postMetricsStatus: true } },
        metricSync: { select: { status: true, source: true, lastSuccessAt: true } },
        _count: { select: { posts: true, metricSnapshots: true } },
      },
    }),
  ]);
  const plan = normalizePlan(user?.plan);
  const sampleSize = normalizeSampleSize(query.posts, plan);

  const selectedAccount = connections.find(account => account.id === query.account);
  const invalidSelection = Boolean(query.account && !selectedAccount);
  const scopeLabel = selectedAccount ? `${selectedAccount.displayName || selectedAccount.platform} (${selectedAccount.platform})` : "all connected accounts";

  const asOf = new Date().toISOString();
  const snapshotRows = (selectedAccount ? [selectedAccount] : connections).map(account => performanceSnapshot({
    id: account.id, platform: account.platform, name: account.displayName || account.platform,
    availablePosts: account._count.posts, historyLimited: account._count.metricSnapshots > 90,
    collectionStatus: account.metricSync?.status ?? "NEVER", collectionSource: account.metricSync?.source ?? null,
    lastCollectionAt: account.metricSync?.lastSuccessAt?.toISOString() ?? null,
    observations: account.metricSnapshots.map(point => ({ date: point.fetchedAt.toISOString(), followers: point.followersCount, posts: point.postCount, postMetricsStatus: point.postMetricsStatus })),
  }, sampleSize, asOf));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy">
          Analytics
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] text-ink sm:text-4xl">
          Reports
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
          Review saved performance, download a snapshot, or generate optional AI analysis. Choose one account or view all your platforms.
        </p>
      </div>

      <ReportAccountSelector accounts={connections.map(({ id, platform, displayName }) => ({ id, platform, displayName }))} selected={query.account || ""} />
      {invalidSelection && <p role="alert" className="workspace-panel rounded-xl border border-border bg-surface p-4 text-sm text-ink">That account is unavailable. Choose a connected account or select all accounts to continue.</p>}
      <PostSampleSelector plan={plan} selected={sampleSize} />

      {!invalidSelection && connections.length > 0 && <PerformanceSnapshot rows={snapshotRows} asOf={asOf} />}

      {connections.length === 0 ? (
        <div className="workspace-panel rounded-xl border border-dashed border-border bg-surface px-8 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy/10 text-xl text-navy">
            ✦
          </div>
          <p className="mt-5 font-display text-xl font-medium text-ink">
            Connect an account first
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
            SocialPanora AI needs account data before it can generate your report.
          </p>
          <Link
            href="/dashboard/accounts"
            className="mt-5 inline-flex rounded-md bg-action px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Connect an account
          </Link>
        </div>
      ) : (
        invalidSelection ? null : <SignalReport sampleSize={sampleSize} accountId={selectedAccount?.id} scopeLabel={scopeLabel} />
      )}
    </div>
  );
}
