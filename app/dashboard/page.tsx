import Link from "next/link";
import EmptyState from "@/components/dashboard/EmptyState";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();

  const connections = session?.user?.id
    ? await prisma.connectedAccount.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
      })
    : [];

  if (connections.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState />
      </div>
    );
  }

  const accountCards = await Promise.all(
    connections.map(async (c) => {
      const snapshot = await prisma.metricSnapshot.findFirst({
        where: { connectedAccountId: c.id },
        orderBy: { fetchedAt: "desc" },
      });
      return { ...c, snapshot };
    })
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-display text-lg font-medium text-ink">
        Your accounts
      </h1>
      <div className="flex flex-col gap-3">
        {accountCards.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/accounts/${c.platform}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:border-navy"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 rounded-full bg-connected"
                aria-hidden="true"
              />
              <span className="font-mono text-sm capitalize text-ink">
                {c.platform}
              </span>
            </div>
            <span className="text-sm text-ink-muted">
              {c.snapshot
                ? `${c.snapshot.followersCount.toLocaleString()} followers`
                : "No data yet"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

