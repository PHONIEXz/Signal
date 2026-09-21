import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
export default async function GetStartedPage() {
  const session=await auth();
  if(!session?.user?.id) redirect("/login");
  const userId=session.user.id;
  const [connections,posts,drafts]=await Promise.all([
    prisma.connectedAccount.count({where:{userId}}),prisma.post.count({where:{connectedAccount:{userId}}}),prisma.contentDraft.count({where:{userId}})
  ]);
  const steps=[{title:"Connect your first account",done:connections>0,href:"/dashboard/accounts",text:"Choose the profile or Facebook Page you want to manage."},{title:"Collect your first posts",done:posts>0,href:"/dashboard/accounts",text:"Open the connected account and refresh. Available metrics depend on the platform and permissions."},{title:"Create a draft",done:drafts>0,href:"/dashboard/content",text:"Write an idea, choose an account and save it. Planned dates are reminders; publishing remains manual."}];
  return <div className="mx-auto max-w-3xl space-y-5"><h1 className="font-display text-3xl">Get started with Signal</h1><p className="text-ink-muted">Connect an account, learn from your posts and prepare your next idea.</p>{steps.map((step,i)=><Link key={step.title} href={step.href} className="block rounded-xl border border-border bg-surface p-6"><p className="text-xs text-ink-muted">{step.done ? "Completed" : `Step ${i+1}`}</p><h2 className="mt-2 text-lg font-medium">{step.title}</h2><p className="mt-2 text-sm text-ink-muted">{step.text}</p></Link>)}<Link href="/dashboard/usage" className="inline-block text-sm underline">View your usage allowance</Link></div>;
}
