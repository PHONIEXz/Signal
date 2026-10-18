import test from "node:test";
import assert from "node:assert/strict";
import { growthRange } from "./growth-chart.ts";

test("small changes on large accounts remain readable, with optional zero baseline", () => {
  assert.deepEqual(growthRange([10000, 10001, 10003]), [9999, 10004]);
  assert.deepEqual(growthRange([10000, 10001, 10003], true), [0, 10004]);
});
test("flat, single, empty and zero histories have nondegenerate nonnegative axes", () => {
  for (const values of [[], [0], [0, 0], [42], [42, 42], [NaN, Infinity]]) {
    const [min, max] = growthRange(values);
    assert.ok(min >= 0 && max > min);
  }
});
test("range contains every observation including declines and outliers", () => {
  const values = [300, 200, 0, 15000];
  const [min, max] = growthRange(values);
  assert.ok(values.every(value => value >= min && value <= max));
});

import { groupGrowth } from "./growth-chart.ts";
const point = (date: string, followers: number | null) => ({date, followers, likes: null, views: null, posts: null});
test("hourly uses latest snapshot rather than adding counters and preserves gaps", () => {
  const grouped = groupGrowth([point("2026-01-01T03:00:00Z", 12), point("2026-01-01T00:10:00Z", 10), point("2026-01-01T00:50:00Z", 11)], "hourly");
  assert.deepEqual(grouped.map(p => p.followers), [11, null, null, 12]);
  assert.equal(grouped[1].captured, false);
});
test("null latest observations are not replaced with stale values", () => {
  assert.equal(groupGrowth([point("2026-01-01T00:00:00Z", 20), point("2026-01-01T01:00:00Z", null)], "daily")[0].followers, null);
});
test("weeks use Monday UTC including across year boundaries", () => {
  const result = groupGrowth([point("2025-12-31T23:00:00Z", 5), point("2026-01-05T00:00:00Z", 7)], "weekly");
  assert.deepEqual(result.map(p => new Date(p.timestamp).toISOString()), ["2025-12-29T00:00:00.000Z", "2026-01-05T00:00:00.000Z"]);
});
test("monthly and yearly use calendar boundaries including leap years", () => {
  assert.deepEqual(groupGrowth([point("2024-02-29T12:00:00Z", 5), point("2024-04-01T00:00:00Z", 8)], "monthly").map(p => p.followers), [5, null, 8]);
  assert.deepEqual(groupGrowth([point("2024-02-29T12:00:00Z", 5), point("2026-04-01T00:00:00Z", 8)], "yearly").map(p => p.followers), [5, null, 8]);
});
test("history windows are bounded and empty inputs stay empty", () => {
  const data = [point("2020-01-01T00:00:00Z", 1), point("2026-10-18T12:00:00Z", 9)];
  for (const [period, count] of [["hourly",24],["daily",30],["weekly",12],["monthly",12],["yearly",5]] as const) {
    assert.equal(groupGrowth(data, period).length, count);
    assert.equal(groupGrowth(data, period).at(-1)?.followers, 9);
    assert.deepEqual(groupGrowth([], period), []);
  }
});

test("stale history exposes missing days through the current day instead of ending at an old refresh", () => {
  const result = groupGrowth([point("2026-10-16T10:00:00Z",100)], "daily", "2026-10-18T12:00:00Z");
  assert.deepEqual(result.map(p=>p.followers),[100,null,null]);
  assert.equal(new Date(result.at(-1)!.timestamp).toISOString(),"2026-10-18T00:00:00.000Z");
});
