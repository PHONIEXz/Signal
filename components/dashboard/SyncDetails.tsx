import { prisma } from "@/lib/prisma";
import { metricsSchemaReady } from "@/lib/metric-storage";

const when=(date:Date)=>date.toLocaleString("en-GB",{timeZone:"UTC",dateStyle:"medium",timeStyle:"short"})+" UTC";
export default async function SyncDetails({ accountId }: { accountId: string }) {
  if (!await metricsSchemaReady()) return <p className="rounded border border-border bg-surface p-4 text-sm">Metrics are temporarily unavailable. Please try again later.</p>;
  const [sync,insight]=await Promise.all([
    prisma.metricSync.findUnique({where:{connectedAccountId:accountId}}),
    prisma.pageInsight.findFirst({where:{connectedAccountId:accountId,metric:"page_media_view"},orderBy:{periodEnd:"desc"}}),
  ]);
  const status=sync?.status === "RUNNING" ? "Refreshing" : sync?.status === "FAILED" ? "Refresh failed" : sync?.status === "LIMITED" ? "Daily limit reached" : sync?.status === "PARTIAL" ? "Some fields unavailable" : sync?.status === "EMPTY" ? "No posts returned" : sync?.status === "AVAILABLE" ? "Collection complete" : "Not collected yet";
  return <section className="rounded-xl border border-border bg-surface p-5 text-sm">
    <h2 className="font-display text-lg font-medium text-ink">About your data</h2>
    <dl className="mt-4 grid gap-4 sm:grid-cols-3">
      <div><dt className="text-ink-muted">Collection</dt><dd className="mt-1 font-medium text-ink">{status}</dd></div>
      <div><dt className="text-ink-muted">Last stored source</dt><dd className="mt-1 font-medium text-ink">{sync?.source === "CSV" ? "CSV, supplied by you" : sync?.source === "API" ? "Platform API" : "No measurement yet"}</dd></div>
      <div><dt className="text-ink-muted">Next refresh</dt><dd className="mt-1 font-medium text-ink">{sync?.nextAllowedAt && sync.nextAllowedAt>new Date() ? when(sync.nextAllowedAt) : "Available now"}</dd></div>
    </dl>
    <p className="mt-4 text-ink-muted">{sync?.lastSuccessAt ? `Last successful collection: ${when(sync.lastSuccessAt)}.` : "No successful collection has been saved yet."}</p>
    {sync?.lastAttemptAt && <p className="mt-1 text-ink-muted">Last attempt: {when(sync.lastAttemptAt)}.</p>}
    {sync?.warning && <p role="status" className="mt-4 rounded-lg bg-paper p-3 leading-6 text-ink">{sync.warning}</p>}
    {insight && <p className="mt-4 border-t border-border pt-3 text-ink-muted">Daily Facebook Page media views: {insight.value.toLocaleString()}, for the period ending {when(insight.periodEnd)}. Includes Page content and ads; separate from views on selected posts.</p>}
  </section>;
}
