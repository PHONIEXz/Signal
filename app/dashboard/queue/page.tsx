import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { publishingSchemaReady } from "@/lib/studio-data";
import { publishingBlocker, schedulingEnabled } from "@/lib/publishing-readiness";
import { isDraftImage } from "@/lib/draft-image";
import PublishingQueue from "@/components/dashboard/PublishingQueue";
export default async function QueuePage() {
  const session=await auth();
  if(!session?.user?.id) redirect("/login");
  if(!await publishingSchemaReady()) return <p>Publishing is temporarily unavailable. Your drafts are safe.</p>;
  const userId=session.user.id;
  const drafts=await prisma.contentDraft.findMany({where:{userId},orderBy:{updatedAt:"desc"},take:100,include:{targets:{include:{connectedAccount:true}},publications:true}});
  // Never serialize tokens or base64 images in this queue; the Studio owns previews.
  return <PublishingQueue userId={userId} schedulingEnabled={schedulingEnabled()} drafts={drafts.map(d=>({
    id:d.id,text:d.text,hasImage:isDraftImage(d.mediaUrl),status:d.status,scheduledFor:d.scheduledFor?.toISOString() ?? null,updatedAt:d.updatedAt.toISOString(),
    accounts:d.targets.map(t=>({id:t.connectedAccount.id,label:t.connectedAccount.displayName || t.connectedAccount.platform,platform:t.connectedAccount.platform,blocker:publishingBlocker(t.connectedAccount,d.text,d.mediaUrl)})),
    receipts:d.publications.map(p=>({accountId:p.connectedAccountId,status:p.status,error:p.errorMessage,url:p.permalinkUrl,updatedAt:p.updatedAt.toISOString()})),
  }))} />;
}
