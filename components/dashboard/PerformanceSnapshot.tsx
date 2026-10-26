"use client";

import { useState } from "react";
import Link from "next/link";
import { LocalTime } from "./TimePreferences";
import { performanceCsv, type PerformanceSnapshot as Snapshot } from "@/lib/performance-snapshot";

const count = (value: number | null) => value === null ? "Unavailable" : value.toLocaleString();
const collectionLabels: Record<string, string> = { AVAILABLE: "Available", PARTIAL: "Some fields unavailable", CONTENT_ONLY: "Post content only", FAILED: "Collection failed", LIMITED: "Collection paused", RUNNING: "Collection in progress", EMPTY: "No posts returned", NEVER: "Not collected yet" };

export default function PerformanceSnapshot({ rows, asOf }: { rows: Snapshot[]; asOf: string }) {
  const [error, setError] = useState("");
  function download() {
    try {
      const url = URL.createObjectURL(new Blob([performanceCsv(rows, asOf)], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `socialpanora-performance-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID().slice(0, 8)}.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setError("");
    } catch { setError("The download could not start. Please try again."); }
  }
  return <section aria-labelledby="performance-snapshot-title" className="space-y-4">
    <div className="workspace-panel rounded-xl border border-border bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-navy">Saved-data report</p><h2 id="performance-snapshot-title" className="mt-2 text-xl font-bold text-ink">Your performance snapshot</h2></div>
        <button type="button" onClick={download} className="min-h-11 rounded-lg bg-action px-4 py-2 text-sm font-semibold text-white">Download snapshot CSV</button>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-muted">A factual summary from saved observations. No AI request or platform refresh is needed. The download includes the accounts shown here, observation dates and coverage notes.</p>
      <p className="mt-2 text-xs text-ink-muted">Prepared <LocalTime value={asOf} />. Downloaded timestamps use UTC.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
    <div className="grid gap-4 md:grid-cols-2">{rows.map(row => <article key={row.id} className="workspace-panel min-w-0 rounded-xl border border-border bg-surface p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy">{row.platform}</p>
      <h3 className="mt-2 break-words text-lg font-bold text-ink">{row.name}</h3>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-ink-muted">Latest followers</dt><dd className="mt-1 text-2xl font-bold text-ink">{count(row.followers)}</dd></div>
        <div><dt className="text-ink-muted">Account total posts</dt><dd className="mt-1 text-2xl font-bold text-ink">{count(row.accountPosts)}</dd></div>
        <div><dt className="text-ink-muted">Observed follower change</dt><dd className="mt-1 font-semibold text-ink">{row.comparison.delta === null ? "Not enough data" : `${row.comparison.delta > 0 ? "+" : ""}${count(row.comparison.delta)}`}</dd></div>
        <div><dt className="text-ink-muted">Saved post sample</dt><dd className="mt-1 font-semibold text-ink">{row.savedPosts} of {row.sampleSize} requested</dd></div>
      </dl>
      <div className="mt-5 space-y-2 rounded-lg bg-paper p-4 text-xs leading-5 text-ink-muted">
        <p>Account measured: {row.measuredAt ? <LocalTime value={row.measuredAt} /> : "No saved observation"}.</p>
        <p>Collection: {collectionLabels[row.collectionStatus] ?? "Status unavailable"}. Post metrics: {row.postMetricsStatus.toLowerCase().replaceAll("_", " ")}.</p>
        <p>Last completed collection: {row.lastCollectionAt ? <LocalTime value={row.lastCollectionAt} /> : "Not recorded"}. Source: {row.collectionSource ?? "Not recorded"}.</p>
        <p>{row.comparison.first && row.comparison.last ? <>Comparison: <LocalTime value={row.comparison.first} /> to <LocalTime value={row.comparison.last} />, using {row.comparison.count} observations inside the last 30 days.</> : "No observations inside the last 30 days."}</p>
        {row.stale && <p className="font-semibold text-ink">The latest account observation is over 24 hours old.</p>}
        {row.historyLimited && <p>History is limited to the latest 90 saved observations.</p>}
      </div>
      <Link href={`/dashboard/accounts/${row.platform}`} className="mt-4 inline-block py-2 text-sm font-semibold text-navy">Review account history →</Link>
    </article>)}</div>
    <p className="text-xs leading-5 text-ink-muted">Missing values are not zero. Changes cover actual observed dates, not an exact 30-day boundary. Saved posts may lack engagement measurements. Audiences can overlap across platforms, so follower counts are not added into a unique audience total.</p>
  </section>;
}
