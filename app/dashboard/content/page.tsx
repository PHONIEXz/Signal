import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ContentStudio from "@/components/dashboard/ContentStudio";
import { draftLimitForPlan, normalizePlan } from "@/lib/content-drafts";

export default async function ContentStudioPage() {
  const session = await auth();
  const userId = session!.user!.id;

  const [user, accounts, drafts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
    prisma.connectedAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { id: true, platform: true, displayName: true },
    }),
    prisma.contentDraft.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        targets: {
          include: {
            connectedAccount: { select: { id: true, platform: true, displayName: true } },
          },
        },
      },
    }),
  ]);

  const plan = normalizePlan(user?.plan ?? "FREE");

  return (
    <ContentStudio
      plan={plan}
      draftLimit={draftLimitForPlan(plan)}
      accounts={accounts}
      initialDrafts={drafts.map((draft) => ({
        ...draft,
        scheduledFor: draft.scheduledFor?.toISOString() ?? null,
        createdAt: draft.createdAt.toISOString(),
        updatedAt: draft.updatedAt.toISOString(),
      }))}
    />
  );
}
