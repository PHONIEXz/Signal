import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { loadStudioDrafts } from "@/lib/studio-data";
import ContentStudio from "@/components/dashboard/ContentStudio";
import { draftLimitForPlan, normalizePlan } from "@/lib/content-drafts";

export default async function ContentStudioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, accounts, drafts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
    prisma.connectedAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, platform: true, displayName: true },
    }),
    loadStudioDrafts(userId),
  ]);

  const plan = normalizePlan(user?.plan ?? "FREE");
  if (drafts === null) return <div className="mx-auto max-w-3xl rounded-xl border border-border bg-surface p-8"><h1 className="font-display text-2xl text-ink">Content Studio needs a database update</h1><p className="mt-3 text-sm leading-6 text-ink-muted">The publishing database upgrade has not been applied to this deployment. Your existing drafts are preserved. The site administrator needs to run the publishing upgrade before this workspace can open.</p><p className="mt-4 text-xs text-ink-muted">Setup code: STUDIO_SCHEMA_PENDING</p></div>;

  return (
    <ContentStudio
      plan={plan}
      draftLimit={draftLimitForPlan(plan)}
      accounts={accounts}
      initialDrafts={drafts.map((draft) => ({
        ...draft,
        publications: draft.publications.map((receipt) => ({
          ...receipt, attemptedAt: receipt.attemptedAt?.toISOString() ?? null, publishedAt: receipt.publishedAt?.toISOString() ?? null,
          createdAt: receipt.createdAt.toISOString(), updatedAt: receipt.updatedAt.toISOString(),
        })),
        scheduledFor: draft.scheduledFor?.toISOString() ?? null,
        createdAt: draft.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString(),
      }))}
    />
  );
}
