import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { isAdmin, serviceReadiness, limit } from "@/lib/service-config";

export default async function OperationsPage() {
  const session = await auth();
  if (!isAdmin(session?.user?.id)) notFound();
  const day = new Date().toISOString().slice(0,10);
  const month = day.slice(0,7);
  const rows = await prisma.authRateLimit.findMany({where:{key:{startsWith:"usage:"}},select:{key:true,count:true}});
  const count = (key:string) => rows.find(row=>row.key===key)?.count ?? 0;
  return <div className="mx-auto max-w-5xl space-y-6">
    <h1 className="font-display text-3xl">Signal operations</h1>
    <p className="text-sm text-ink-muted">Private owner view. Credentials being present does not confirm provider approval, credit balance or API health.</p>
    <div className="grid gap-4 sm:grid-cols-3">{(["ai","metrics","publishing"] as const).map(service=><section key={service} className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-medium capitalize">{service}</h2>
      <p className="mt-3">Today: {count(`usage:${service}:global:${day}`)} / {limit(`SIGNAL_${service.toUpperCase()}_GLOBAL_DAILY`,100)}</p>
      <p>This month: {count(`usage:${service}:month:${month}`)} / {limit(`SIGNAL_${service.toUpperCase()}_GLOBAL_MONTHLY`,2000)}</p>
      <p className="mt-2 text-sm">Recorded failures today: {count(`usage:${service}:failed:${day}`)}</p>
    </section>)}</div>
    <section className="rounded-xl border border-border bg-surface p-5"><h2 className="font-medium">Service setup</h2><ul className="mt-3 space-y-2">{serviceReadiness().map(service=><li key={service.name}>{service.name}: {service.configured ? "credentials present" : "setup incomplete"}; {service.enabled ? "enabled" : "paused"}</li>)}</ul></section>
    <section className="rounded-xl border border-border bg-surface p-5"><h2 className="font-medium">Spending and activation</h2><p className="mt-2 text-sm">These are reserved operation counts, not provider invoices. Failed attempts may still cost money. Use provider billing dashboards for actual spending. Configure SIGNAL_AI_ENABLED, SIGNAL_METRICS_ENABLED or SIGNAL_PUBLISHING_ENABLED as false in Vercel and redeploy to pause new operations. Already accepted operations may finish.</p><p className="mt-2 text-sm">See docs/service-activation.md in the repository for credentials, caps, migrations and launch checks.</p></section>
  </div>;
}
