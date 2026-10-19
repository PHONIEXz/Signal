import { prisma } from "@/lib/prisma";
import { readDailyRuns } from "@/lib/daily-run-store";
import { accountCoverage, runStatus, scheduleHealth } from "@/lib/collection-health";
import { LocalTime } from "./TimePreferences";

const labels: Record<string, string> = {
  NOT_DUE: "Not due yet", WAITING: "Waiting for scheduled collection", MISSING: "No scheduled run recorded today",
  RUNNING: "Collection in progress", INTERRUPTED: "Run did not record a finish", COMPLETE: "Run finished",
  INCOMPLETE: "Run finished with incomplete work", FAILED: "Run failed", PAUSED: "Collection paused",
};

/** Service-level metadata only: no account identities, provider payloads or global usage counts. */
export async function ScheduledCollectionHealth() {
  const now = new Date();
  const runs = await readDailyRuns(prisma).catch(() => null);
  if (!runs) return <p role="status" className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm text-ink-muted">Collection monitoring is temporarily unavailable. This does not establish whether collection succeeded or failed.</p>;
  const health = scheduleHealth(runs, now);
  const warning = ["MISSING", "INTERRUPTED", "INCOMPLETE", "FAILED"].includes(health.state);
  return <section id="collection-health" aria-labelledby="collection-health-title" className="mt-6 rounded-3xl border border-border bg-surface p-5 sm:p-6">
    <p className="section-kicker">Collection health</p>
    <h2 id="collection-health-title" className="mt-2 text-xl font-bold text-ink">Daily history monitoring</h2>
    <p role="status" className={`mt-4 rounded-xl border p-3 text-sm font-semibold ${warning ? "border-amber-500/30 bg-amber-500/10 text-ink" : "border-border bg-paper text-ink"}`}>{labels[health.state] ?? health.state}</p>
    <p className="mt-2 text-xs text-ink-muted">Status checked <LocalTime value={now} />. Reload to check again.</p>
    <p className="mt-3 text-sm leading-6 text-ink-muted">Today’s scheduled window: <LocalTime value={health.start} /> to <LocalTime value={health.end} />. Allow 15 minutes after the window before treating an absent run as overdue.</p>
    {health.state === "MISSING" && <p className="mt-2 text-sm text-ink-muted">There is no saved scheduler invocation for today. This needs investigation; it is not proof that every account is missing data. Manual refreshes are recorded separately.</p>}
    {health.state === "INTERRUPTED" && <p className="mt-2 text-sm text-ink-muted">This run started more than six minutes ago without a saved finish. It may have timed out or lost its database connection. Recorded progress is preserved.</p>}
    {health.latest && <p className="mt-2 text-sm text-ink-muted">Last recorded scheduler start: <LocalTime value={health.latest.startedAt} />.</p>}
    <p className="mt-3 text-xs leading-6 text-ink-muted">This is the shared collector’s status. Each account’s saved measurements and access restrictions determine its own coverage. Failed runs are not retried automatically; manual refresh uses your normal allowance.</p>
    <details className="mt-4 rounded-xl border border-border p-4">
      <summary className="cursor-pointer text-sm font-semibold text-ink">Recent run history</summary>
      {!runs.length ? <p className="mt-3 text-sm text-ink-muted">No runs recorded by this monitor yet. Earlier executions are not reconstructed.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">Recent scheduled and authorized collector invocations</caption>
        <thead><tr><th scope="col" className="p-2">Started</th><th scope="col" className="p-2">Trigger</th><th scope="col" className="p-2">Result</th><th scope="col" className="p-2">Finished</th></tr></thead>
        <tbody>{runs.toSorted((a,b) => Date.parse(b.startedAt)-Date.parse(a.startedAt)).slice(0,20).map(run => <tr key={run.id} className="border-t border-border">
          <td className="whitespace-nowrap p-2"><LocalTime value={run.startedAt} /></td><td className="p-2">{run.trigger === "scheduler" ? "Scheduler" : "Authorized invocation"}</td>
          <td className="p-2">{labels[runStatus(run, now)] ?? run.status}</td><td className="whitespace-nowrap p-2">{run.finishedAt ? <LocalTime value={run.finishedAt} /> : "No finish recorded"}</td>
        </tr>)}</tbody></table></div>}
    </details>
  </section>;
}

/** Only mounted by the authenticated account page after ownership is checked. */
export async function AccountCollectionCoverage({accountId}: {accountId: string}) {
  const now = new Date();
  const from = new Date(now); from.setUTCDate(from.getUTCDate()-6); from.setUTCHours(0,0,0,0);
  const account = await prisma.connectedAccount.findUnique({where:{id:accountId},select:{createdAt:true,user:{select:{analyticsCollectionEnabled:true}},metricSnapshots:{where:{fetchedAt:{gte:from,lte:now}},orderBy:{fetchedAt:"desc"},select:{fetchedAt:true},take:1000}}}).catch(() => undefined);
  if (account === undefined) return <p className="mt-4 text-xs text-ink-muted">Daily coverage could not be checked. Saved measurements remain separate from this status.</p>;
  if (!account) return null;
  const health = accountCoverage(account.metricSnapshots.map(row=>row.fetchedAt), account.createdAt, account.user.analyticsCollectionEnabled, now);
  const title = health.state === "PAUSED" ? "Daily collection is paused in Settings" : health.hasToday ? "Account counters recorded today" : health.state === "WAITING" ? "Today’s account counters are pending" : "No account counters recorded today";
  return <div className="mt-4 border-t border-border pt-4">
    <h3 className="font-semibold text-ink">Daily history coverage</h3>
    <p role="status" className="mt-2 text-sm text-ink">{title}</p>
    {health.completed.length > 0 && <p className="mt-2 text-xs leading-6 text-ink-muted">{health.recorded} of {health.completed.length} recent completed UTC days have saved account counters. Only days when this account was already connected before the collection window are included.</p>}
    {health.completed.some(day=>!day.recorded) && <p className="mt-1 text-xs leading-6 text-ink-muted">Days without a saved measurement: {health.completed.filter(day=>!day.recorded).map(day=>day.day).join(", ")}. Gaps can reflect paused collection, permissions, limits or failed requests; they are not zero growth.</p>}
    <p className="mt-2 text-xs leading-6 text-ink-muted">Coverage counts any saved account counter snapshot for a UTC day, including manual refreshes. It does not confirm that post metrics were available or that the scheduler ran.</p>
  </div>;
}
