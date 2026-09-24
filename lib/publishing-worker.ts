import { prisma } from "./prisma.ts";
import { publishDraft } from "./publish-draft.ts";
import { schedulingEnabled } from "./publishing-readiness.ts";

export async function runPublishingQueue(request: typeof fetch = fetch, now = new Date()) {
  if (!schedulingEnabled()) return {paused:true,processed:0};
  // Never retry abandoned deliveries: the provider might have accepted them.
  await prisma.$transaction(async tx=>{
    const stale = await tx.contentDraft.findMany({where:{status:"PROCESSING",updatedAt:{lt:new Date(now.getTime()-15*60000)}},select:{id:true},take:20});
    for (const {id} of stale) {
      await tx.contentPublication.updateMany({where:{contentDraftId:id,status:"PUBLISHING"},data:{status:"UNKNOWN",errorCode:"WORKER_INTERRUPTED",errorMessage:"Delivery was interrupted. Check the platform before posting again."}});
      await tx.contentDraft.updateMany({where:{id,status:"PROCESSING"},data:{status:"ATTENTION"}});
    }
    await tx.contentDraft.updateMany({where:{status:"QUEUED",scheduledFor:{lt:new Date(now.getTime()-15*60000)}},data:{status:"ATTENTION"}});
  });
  const due = await prisma.contentDraft.findMany({where:{status:"QUEUED",scheduledFor:{lte:now}},orderBy:{scheduledFor:"asc"},select:{id:true,userId:true,updatedAt:true},take:2});
  let processed=0;
  await Promise.all(due.map(async draft=>{
    const claim = await prisma.contentDraft.updateMany({where:{id:draft.id,status:"QUEUED",updatedAt:draft.updatedAt,scheduledFor:{lte:now}},data:{status:"PROCESSING",updatedAt:now}});
    if (!claim.count) return;
    processed++;
    try {
      const targets = await prisma.contentDraftTarget.findMany({where:{contentDraftId:draft.id},select:{connectedAccountId:true}});
      // Current model allows one account per platform; supported direct targets <= 2.
      await Promise.all(targets.map(async target=>{
        try { await publishDraft(draft.userId,draft.id,target.connectedAccountId,request,{scheduled:true}); }
        catch { /* The delivery service stores safe errors; the queue remains actionable. */ }
      }));
      const receipts = await prisma.contentPublication.findMany({where:{contentDraftId:draft.id},select:{status:true}});
      const complete = targets.length > 0 && receipts.length === targets.length && receipts.every(r=>r.status === "PUBLISHED");
      await prisma.contentDraft.updateMany({where:{id:draft.id,status:"PROCESSING"},data:{status:complete ? "PUBLISHED" : "ATTENTION"}});
    } catch {
      await prisma.contentDraft.updateMany({where:{id:draft.id,status:"PROCESSING"},data:{status:"ATTENTION"}}).catch(()=>{});
    }
  }));
  return {paused:false,processed};
}
