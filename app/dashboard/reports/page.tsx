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
        <div className="rounded-xl border border-border bg-surface p-8">
          <h1 className="font-display text-xl font-medium text-ink">
            Reports
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Sign in to view your Signal AI report.
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
      select: { id: true, platform: true, displayName: true },
    }),
  ]);
  const plan = normalizePlan(user?.plan);
  const sampleSize = normalizeSampleSize(query.posts, plan);

  const selectedAccount = connections.find(account => account.id === query.account);
  const invalidSelection = Boolean(query.account && !selectedAccount);
  const scopeLabel = selectedAccount ? `${selectedAccount.displayName || selectedAccount.platform} (${selectedAccount.platform})` : "all connected accounts";

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
          Choose an account or compare all your platforms. Generate deeper analysis from saved metrics and posts when you need it.
        </p>
      </div>

      <ReportAccountSelector accounts={connections} selected={query.account || ""} />
      {invalidSelection && <p role="alert" className="rounded-xl border border-border bg-surface p-4 text-sm text-ink">That account is unavailable. Choose a connected account or select all accounts to continue.</p>}
      <PostSampleSelector plan={plan} selected={sampleSize} />

      {connections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-8 py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy/10 text-xl text-navy">
            ✦
          </div>
          <p className="mt-5 font-display text-xl font-medium text-ink">
            Connect an account first
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
            Signal AI needs account data before it can generate your report.
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
