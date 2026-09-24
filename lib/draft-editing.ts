import { prisma } from "./prisma.ts";
import { draftInclude } from "./content-drafts.ts";
import { LOCKED_DELIVERIES } from "./content-publishing.ts";

export type DraftEdit = {
  text: string;
  mediaUrl: string;
  targetIds: string[];
  scheduledFor: Date | null;
  expectedUpdatedAt: Date;
};

// The caller validates ownership of targets, input and plan access first.
export async function updateDraft(userId: string, id: string, edit: DraftEdit) {
  return prisma.$transaction(async (tx) => {
    const owner = await tx.contentDraft.findFirst({ where: { id, userId } });
    if (!owner) return "MISSING" as const;
    if (["QUEUED","PROCESSING"].includes(owner.status)) return "LOCKED" as const;
    if (await tx.contentPublication.count({ where: { contentDraftId: id, status: { in: LOCKED_DELIVERIES } } })) return "LOCKED" as const;
    // Advance even within the same millisecond so every save has a distinct version.
    const updatedAt = new Date(Math.max(Date.now(), owner.updatedAt.getTime() + 1));
    const claimed = await tx.contentDraft.updateMany({
      where: { id, userId, updatedAt: edit.expectedUpdatedAt },
      data: { text: edit.text, mediaUrl: edit.mediaUrl || null, scheduledFor: edit.scheduledFor,
        status: edit.scheduledFor ? "SCHEDULED" : "DRAFT", updatedAt },
    });
    if (claimed.count !== 1) return "CONFLICT" as const;
    await tx.contentPublication.deleteMany({ where: { contentDraftId: id } });
    await tx.contentDraftTarget.deleteMany({ where: { contentDraftId: id } });
    await tx.contentDraftTarget.createMany({ data: edit.targetIds.map((connectedAccountId) => ({ contentDraftId: id, connectedAccountId })) });
    return tx.contentDraft.findUniqueOrThrow({ where: { id }, include: draftInclude });
  });
}
