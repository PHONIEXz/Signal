import { prisma } from "@/lib/prisma";
import { metricsSchemaReady } from "@/lib/metric-storage";
export default async function SyncDetails({accountId}:{accountId:string}) {
  if(!await metricsSchemaReady()) {
    console.error("Metrics diagnostics: METRICS_SCHEMA_PENDING");
    return <p className="rounded border border-border bg-surface p-4 text-sm">Analytics setup is temporarily unavailable. Please try again later.</p>;
  }
  const sync=await prisma.metricSync.findUnique({where:{connectedAccountId:accountId}});
  const insight=await prisma.pageInsight.findFirst({where:{connectedAccountId:accountId,metric:"page_media_view"},orderBy:{periodEnd:"desc"}});
  if (sync?.warning) {
    console.warn("Metrics diagnostics: refresh completed with limited data", {
      accountId,
      status: sync.status,
      source: sync.source,
      missingFields: sync.missingFields,
      warning: sync.warning,
    });
  }

  return <div className="rounded-xl border border-border bg-surface p-4 text-sm"><p className="font-medium text-ink">Data sync</p><dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-ink-muted">Last updated</dt><dd>{sync?.lastSuccessAt?.toLocaleString("en-US")??"Waiting for first refresh"}</dd></div><div><dt className="text-ink-muted">Posts analyzed</dt><dd>{sync?.receivedPosts??0}</dd></div><div><dt className="text-ink-muted">Next refresh</dt><dd>{sync?.nextAllowedAt?.toLocaleString("en-US")??"Available now"}</dd></div>{insight&&<div><dt className="text-ink-muted">Latest Page views</dt><dd>{insight.value.toLocaleString()}</dd></div>}</dl>{sync?.warning&&<p className="mt-3 text-xs text-ink-muted">Signal saved the available data. More insights will appear automatically as the platform makes them available.</p>}</div>;
}
