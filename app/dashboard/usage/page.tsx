import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { userLimit, enabled } from "@/lib/service-config";
import { usageKeys } from "@/lib/service-usage";
export default async function UsagePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const user = await prisma.user.findUnique({where:{id:userId},select:{plan:true}});
  const now=new Date();
  const services=["ai","metrics","publishing"] as const;
  const keys=services.map(service=>usageKeys(service,userId,now)[0]);
  const rows=await prisma.authRateLimit.findMany({where:{key:{in:keys}}});
  return <div className="mx-auto max-w-3xl space-y-5"><h1 className="font-display text-3xl">Your daily allowance</h1><p className="text-sm text-ink-muted">Resets at 00:00 UTC. Attempts count toward the allowance, including requests that the platform cannot complete. Simple greetings do not use your AI allowance.</p>{services.map((service,i)=><section key={service} className="rounded-xl border border-border bg-surface p-5"><h2 className="font-medium capitalize">{service}</h2><p className="mt-2">{rows.find(row=>row.key===keys[i])?.count ?? 0} / {userLimit(service,user?.plan ?? "FREE")} used today</p>{!enabled(service)&&<p className="mt-2 text-sm">Temporarily paused.</p>}</section>)}</div>;
}
