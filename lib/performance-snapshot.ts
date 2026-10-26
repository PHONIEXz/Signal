import { channelComparison } from "./channel-comparison.ts";

export type SnapshotAccount = {
  id: string; platform: string; name: string; availablePosts: number; historyLimited: boolean;
  collectionStatus: string; collectionSource: string | null; lastCollectionAt: string | null;
  observations: { date: string; followers: number | null; posts: number | null; postMetricsStatus: string }[];
};
export function performanceSnapshot(account: SnapshotAccount, sampleSize: number, asOf: string) {
  const observations = account.observations.filter(point => Number.isFinite(Date.parse(point.date)) && Date.parse(point.date) <= Date.parse(asOf))
    .toSorted((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const latest = observations.at(-1);
  const comparison = channelComparison(observations.map(point => ({ ...point, likes: null, views: null })), 30, asOf);
  const validCount = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
  return {
    id: account.id, platform: account.platform, name: account.name,
    followers: validCount(latest?.followers), accountPosts: validCount(latest?.posts),
    measuredAt: latest?.date ?? null, stale: !!latest && Date.parse(asOf) - Date.parse(latest.date) > 86400000,
    postMetricsStatus: latest?.postMetricsStatus ?? "UNAVAILABLE",
    sampleSize, savedPosts: Math.min(sampleSize, account.availablePosts),
    collectionStatus: account.collectionStatus, collectionSource: account.collectionSource,
    lastCollectionAt: account.lastCollectionAt, historyLimited: account.historyLimited,
    comparison,
  };
}
export type PerformanceSnapshot = ReturnType<typeof performanceSnapshot>;

function csvCell(value: string | number | boolean | null) {
  if (value === null) return '"Unavailable"';
  let text = String(value);
  // Account names can be user controlled. Prevent spreadsheet formula execution.
  if (typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(value)) text = "'" + value;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function performanceCsv(rows: PerformanceSnapshot[], asOf: string) {
  const header = ["Report prepared at (UTC)", "Account", "Platform", "Latest followers", "Account total posts", "Account measured at (UTC)", "Account observation over 24h old", "Requested post sample", "Saved posts in sample", "Post metrics status", "Collection status", "Last collection source", "Last completed collection (UTC)", "Comparison window days", "First observation in window (UTC)", "Last observation in window (UTC)", "Observations in window", "Follower change across observed interval", "Follower change percent", "History capped at latest 90", "Limitations"];
  const limitations = "Saved data only; no provider refresh or AI generation. Missing values are not zero. Follower changes cover observed dates, not an exact 30-day boundary. Saved post counts do not imply measured engagement. Platform audiences may overlap.";
  return "\uFEFF" + [header, ...rows.map(row => [asOf, row.name, row.platform, row.followers, row.accountPosts, row.measuredAt, row.stale, row.sampleSize, row.savedPosts, row.postMetricsStatus, row.collectionStatus, row.collectionSource, row.lastCollectionAt, 30, row.comparison.first, row.comparison.last, row.comparison.count, row.comparison.delta, row.comparison.percent, row.historyLimited, limitations])].map(row => row.map(csvCell).join(",")).join("\r\n");
}
