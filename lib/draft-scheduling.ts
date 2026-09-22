import { prisma } from "./prisma.ts";
import { LOCKED_DELIVERIES, PublishError } from "./content-publishing.ts";
import { publishingBlocker, schedulingEnabled, validSchedule } from "./publishing-readiness.ts";

export async function changeSchedule(userId: string, id: string, expectedUpdatedAt: Date, action: "schedule" | "cancel", scheduledFor?: string, now = new Date()) {
  const when = action === "schedule" && scheduledFor ? validSchedule(scheduledFor, now) : null;
  if (action === "schedule" && (!when || !schedulingEnabled())) throw new PublishError("FAILED", !when ? "Choose a time at least one minute ahead and within 90 days." : "Automatic scheduling is not active yet. Your draft can still be saved as a reminder.");
  return prisma.$transaction(async tx => {
    const draft = await tx.contentDraft.findFirst({where:{id,userId},include:{targets:{include:{connectedAccount:true}},publications:true}});
    if (!draft) throw new PublishError("NOT_FOUND","Draft not found.");
    if (draft.updatedAt.getTime() !== expectedUpdatedAt.getTime()) throw new PublishError("CONFLICT","This draft changed. Refresh before confirming again.");
    if (draft.status === "PROCESSING" || draft.publications.some(p=>LOCKED_DELIVERIES.includes(p.status))) throw new PublishError("LOCKED","Delivery has started or has history. Check its receipts before creating a copy.");
    if (action === "cancel" && draft.status !== "QUEUED") throw new PublishError("CONFLICT","This draft is no longer scheduled for automatic delivery.");
    if (action === "schedule") {
      if (!draft.targets.length) throw new PublishError("FAILED","Choose a connected account first.");
      const user = await tx.user.findUnique({where:{id:userId},select:{plan:true}});
      if (user?.plan !== "PRO" && draft.targets.length > 1) throw new PublishError("FAILED","Your current plan supports one target.");
      for (const target of draft.targets) {
        if (target.connectedAccount.userId !== userId) throw new PublishError("NOT_FOUND","Account not found.");
        const blocker = publishingBlocker(target.connectedAccount,draft.text,draft.mediaUrl,now);
        if (blocker) throw new PublishError("FAILED",blocker);
      }
    }
    const result = await tx.contentDraft.updateMany({where:{id,userId,updatedAt:expectedUpdatedAt,status:{not:"PROCESSING"}},data:{status:action === "cancel" ? "DRAFT" : "QUEUED",scheduledFor:when,updatedAt:new Date(Math.max(now.getTime(),draft.updatedAt.getTime()+1))}});
    if (result.count !== 1) throw new PublishError("CONFLICT","The draft changed while confirming. Refresh and try again.");
    // Explicit re-scheduling may reset only definitively failed delivery attempts.
    if (action === "schedule") await tx.contentPublication.deleteMany({where:{contentDraftId:id}});
    return {status:action === "cancel" ? "DRAFT" : "QUEUED",scheduledFor:when?.toISOString() ?? null};
  });
}
