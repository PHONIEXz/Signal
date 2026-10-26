import { test } from "node:test";
import assert from "node:assert/strict";
import { performanceSnapshot, performanceCsv, type SnapshotAccount } from "./performance-snapshot.ts";
const asOf = "2026-10-26T10:00:00.000Z";
const account: SnapshotAccount = { id: "a", name: "Example", platform: "x", availablePosts: 3, historyLimited: false, collectionStatus: "PARTIAL", collectionSource: "API", lastCollectionAt: null, observations: [] };
test("snapshot preserves missing counts and actual comparison dates", () => {
  const row = performanceSnapshot({ ...account, observations: [
    { date: "2026-10-26T09:00:00.000Z", followers: 0, posts: null, postMetricsStatus: "UNAVAILABLE" },
    { date: "2026-10-20T09:00:00.000Z", followers: 5, posts: 2, postMetricsStatus: "PARTIAL" },
    { date: "2026-10-27T09:00:00.000Z", followers: 999, posts: 999, postMetricsStatus: "AVAILABLE" },
  ] }, 10, asOf);
  assert.equal(row.followers, 0); assert.equal(row.accountPosts, null);
  assert.equal(row.comparison.delta, -5); assert.equal(row.comparison.count, 2);
  assert.equal(row.savedPosts, 3); assert.equal(row.postMetricsStatus, "UNAVAILABLE");
});
test("old observations remain dated but do not imply current-window growth", () => {
  const row = performanceSnapshot({ ...account, observations: [{ date: "2026-08-01T00:00:00Z", followers: 8, posts: 0, postMetricsStatus: "PARTIAL" }] }, 5, asOf);
  assert.equal(row.followers, 8); assert.equal(row.stale, true); assert.equal(row.comparison.delta, null);
  const empty = performanceSnapshot(account, 5, asOf);
  assert.equal(empty.followers, null); assert.equal(empty.measuredAt, null);
});
test("CSV retains coverage and neutralizes formula-like account names", () => {
  const row = performanceSnapshot({ ...account, name: '=HYPERLINK("bad")\nnext' }, 10, asOf);
  const csv = performanceCsv([row], asOf);
  assert.ok(csv.startsWith("\uFEFF")); assert.ok(csv.includes('"\'=HYPERLINK(""bad"")\nnext"'));
  assert.match(csv, /Unavailable/); assert.match(csv, /Missing values are not zero/);
  assert.match(csv, /Requested post sample/); assert.match(csv, /Last collection source/);
});
