import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { isAdmin, serviceReadiness, limit } from "@/lib/service-config";
import PageIntro from "@/components/dashboard/PageIntro";

export default async function OperationsPage() {
  const session = await auth();
  if (!isAdmin(session?.user?.id)) notFound();
  const day = new Date().toISOString().slice(0,10);
  const month = day.slice(0,7);
  const rows = await prisma.authRateLimit.findMany({where:{key:{startsWith:"usage:"}},select:{key:true,count:true}});
  const count = (key:string) => rows.find(row=>row.key===key)?.count ?? 0;
  return <div className="mx-auto max-w-5xl space-y-8">
    <PageIntro eyebrow="Workspace / Owner view" title="Signal operations" description="Credentials being present does not confirm provider approval, credit balance or API health." />
    <div className="grid gap-4 sm:grid-cols-3">{(["ai","metrics","publishing"] as const).map(service=><section key={service} className="editorial-panel border-t-2 border-t-navy p-5">
      <h2 className="eyebrow capitalize">{service}</h2>
      <p className="mt-5 text-sm text-ink">Today: {count(`usage:${service}:global:${day}`)} / {limit(`SIGNAL_${service.toUpperCase()}_GLOBAL_DAILY`,100)}</p>
      <p className="mt-2 text-sm text-ink-muted">This month: {count(`usage:${service}:month:${month}`)} / {limit(`SIGNAL_${service.toUpperCase()}_GLOBAL_MONTHLY`,2000)}</p>
      <p className="mt-2 text-sm text-ink-muted">Recorded failures today: {count(`usage:${service}:failed:${day}`)}</p>
    </section>)}</div>
    <section className="editorial-panel p-6"><h2 className="font-display text-2xl text-ink">Service setup</h2><ul className="mt-4 divide-y divide-border text-sm text-ink-muted">{serviceReadiness().map(service=><li className="py-3" key={service.name}>{service.name}: {service.configured ? "credentials present" : "setup incomplete"}; {service.enabled ? "enabled" : "paused"}</li>)}</ul></section>
    <section className="border-l-2 border-amber pl-5"><h2 className="font-display text-2xl text-ink">Spending and activation</h2><p className="mt-3 text-sm leading-6 text-ink-muted">These are reserved operation counts, not provider invoices. Failed attempts may still cost money. Use provider billing dashboards for actual spending. Configure SIGNAL_AI_ENABLED, SIGNAL_METRICS_ENABLED or SIGNAL_PUBLISHING_ENABLED as false in Vercel and redeploy to pause new operations. Already accepted operations may finish.</p><p className="mt-3 text-sm text-ink-muted">See docs/service-activation.md in the repository for credentials, caps, migrations and launch checks.</p></section>
  </div>;
}
