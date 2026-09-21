import { prisma } from "@/lib/prisma";
import { metricsSchemaReady } from "@/lib/metric-storage";

export default async function SyncDetails({ accountId }: { accountId: string }) {
  if (!await metricsSchemaReady()) return <p className="rounded border border-border bg-surface p-4 text-sm">Metrics are temporarily unavailable. Please try again later.</p>;
  const sync = await prisma.metricSync.findUnique({ where: { connectedAccountId: accountId } });
  const insight = await prisma.pageInsight.findFirst({ where: { connectedAccountId: accountId, metric: "page_media_view" }, orderBy: { periodEnd: "desc" } });
  return <section className="rounded-xl border border-border bg-surface p-4 text-sm">
    <h2 className="font-medium text-ink">About your data</h2>
    <p className="mt-2 text-ink-muted">{sync?.lastSuccessAt ? `Last updated ${sync.lastSuccessAt.toLocaleString("en-US")}.` : "Refresh this account to collect your first insights."}</p>
    {sync?.status === "RUNNING" && <p className="mt-2">A refresh is in progress.</p>}
    {sync?.status === "FAILED" && <p className="mt-2">The last refresh could not finish. Your saved data is still available.</p>}
    {insight && <p className="mt-3 border-t border-border pt-3 text-xs text-ink-muted">Daily Facebook Page media views: {insight.value.toLocaleString()}, for the period ending {insight.periodEnd.toLocaleString("en-US")}. This includes Page content and ads and is separate from views on your selected posts.</p>}
  </section>;
}
