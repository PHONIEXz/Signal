import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import SignalReport from "@/components/dashboard/SignalReport";
import PostSampleSelector from "@/components/dashboard/PostSampleSelector";
import { normalizePlan, normalizeSampleSize } from "@/lib/metrics";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ posts?: string }>;
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
      select: { id: true, platform: true },
    }),
  ]);
  const plan = normalizePlan(user?.plan);
  const sampleSize = normalizeSampleSize(query.posts, plan);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy">
          Analytics
        </p>
        <h1 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">
          Reports
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
          Signal AI automatically turns your latest account metrics and
          stored content into practical growth insights.
        </p>
      </div>

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
            className="mt-5 inline-flex rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Connect an account
          </Link>
        </div>
      ) : (
        <SignalReport key={sampleSize} sampleSize={sampleSize} />
      )}
    </div>
  );
}
