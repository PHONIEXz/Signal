import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { userLimit, enabled } from "@/lib/service-config";
import { usageKeys } from "@/lib/service-usage";
import PageIntro from "@/components/dashboard/PageIntro";
export default async function UsagePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  const now = new Date();
  const services = ["ai", "metrics", "publishing"] as const;
  const keys = services.map((service) => usageKeys(service, userId, now)[0]);
  const rows = await prisma.authRateLimit.findMany({ where: { key: { in: keys } } });
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageIntro eyebrow="Workspace / Usage" title="Your daily allowance" description="Your current usage across Signal services. The allowance resets at 00:00 UTC." />
      <div className="grid gap-4 sm:grid-cols-3">
        {services.map((service, index) => {
          const used = rows.find((row) => row.key === keys[index])?.count ?? 0;
          const allowance = userLimit(service, user?.plan ?? "FREE");
          return (
            <section key={service} className="editorial-panel border-t-2 border-t-navy p-5">
              <h2 className="eyebrow capitalize">{service}</h2>
              <p className="mt-6 font-display text-4xl text-ink">{used}<span className="ml-1 text-xl text-ink-muted">/ {allowance}</span></p>
              <p className="mt-2 text-xs text-ink-muted">used today</p>
              {!enabled(service) && <p className="mt-4 text-xs font-semibold text-amber">Temporarily paused</p>}
            </section>
          );
        })}
      </div>
      <p className="max-w-2xl border-l-2 border-amber pl-4 text-sm leading-6 text-ink-muted">Attempts count toward the allowance, including requests the platform cannot complete. Simple greetings do not use your AI allowance.</p>
    </div>
  );
}
