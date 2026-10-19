import { getMetricRefreshGate } from "@/lib/metric-refresh-gate";
import { LocalTime } from "@/components/dashboard/TimePreferences";
import { prisma } from "@/lib/prisma";
import { metricsSchemaReady } from "@/lib/metric-storage";


export default async function SyncDetails({ accountId }: { accountId: string }) {
  if (!await metricsSchemaReady()) return <p className="rounded border border-border bg-surface p-4 text-sm">Metrics are temporarily unavailable. Please try again later.</p>;
  const [sync,insight,gate,snapshot]=await Promise.all([
    prisma.metricSync.findUnique({where:{connectedAccountId:accountId}}),
    prisma.pageInsight.findFirst({where:{connectedAccountId:accountId,metric:"page_media_view"},orderBy:{periodEnd:"desc"}}),
    getMetricRefreshGate(accountId),
    prisma.metricSnapshot.findFirst({where:{connectedAccountId:accountId},orderBy:{fetchedAt:"desc"},select:{fetchedAt:true}}),
  ]);
  const status=sync?.status === "RUNNING" ? "Refreshing" : sync?.status === "FAILED" ? "Refresh failed" : sync?.status === "LIMITED" ? "Daily limit reached" : sync?.status === "PARTIAL" ? "Some fields unavailable" : sync?.status === "EMPTY" ? "No posts returned" : sync?.status === "AVAILABLE" ? "Collection complete" : "Not collected yet";
  return <section className="rounded-xl border border-border bg-surface p-5 text-sm">
    <h2 className="font-display text-lg font-medium text-ink">About your data</h2>
    <dl className="mt-4 grid gap-4 sm:grid-cols-3">
      <div><dt className="text-ink-muted">Collection</dt><dd className="mt-1 font-medium text-ink">{status}</dd></div>
      <div><dt className="text-ink-muted">Last stored source</dt><dd className="mt-1 font-medium text-ink">{sync?.source === "CSV" ? "CSV, supplied by you" : sync?.source === "API" ? "Platform API" : "No measurement yet"}</dd></div>
      <div><dt className="text-ink-muted">Next refresh</dt><dd className="mt-1 font-medium text-ink">{gate.reason ? gate.availableAt ? <LocalTime value={gate.availableAt} /> : "Paused" : "Available now"}</dd></div>
    </dl>
    {gate.reason && <p className="mt-3 text-ink-muted">{gate.reason}</p>}
    {snapshot && <p className="mt-4 text-ink-muted">Latest saved account counters: {<LocalTime value={snapshot.fetchedAt} />}.</p>}
    <p className="mt-2 text-ink-muted">{sync?.lastSuccessAt ? <>Last completed post collection: <LocalTime value={sync.lastSuccessAt} />.</> : "No completed post collection is recorded. Any saved account counters remain available separately."}</p>
    {sync?.lastAttemptAt && <p className="mt-1 text-ink-muted">Last attempt: {<LocalTime value={sync.lastAttemptAt} />}.</p>}
    {sync?.warning && <p role="status" className="mt-4 rounded-lg bg-paper p-3 leading-6 text-ink">{sync.warning}</p>}
    {insight && <p className="mt-4 border-t border-border pt-3 text-ink-muted">Daily Facebook Page media views: {insight.value.toLocaleString()}, for the period ending {<LocalTime value={insight.periodEnd} />}. {insight.periodEnd > new Date() && "This period is still in progress; its value is provisional."} Includes Page content and ads; separate from views on selected posts.</p>}
  </section>;
}
