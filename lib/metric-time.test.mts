import test from "node:test";
import assert from "node:assert/strict";
import { metricTime, validTimeZone } from "./metric-time.ts";

test("Lagos displays WAT and rolls dates across midnight", () => {
  assert.equal(metricTime("2026-10-18T23:30:00Z", "Africa/Lagos"), "19 Oct 2026, 00:30 WAT");
});
test("daylight saving zones use the offset of the observation", () => {
  assert.equal(metricTime("2026-01-15T12:00:00Z", "America/New_York"), "15 Jan 2026, 07:00 America/New_York");
  assert.equal(metricTime("2026-07-15T12:00:00Z", "America/New_York"), "15 Jul 2026, 08:00 America/New_York");
});
test("fractional offsets, invalid zones and invalid dates are safe", () => {
  assert.equal(metricTime("2026-10-18T20:00:00Z", "Asia/Kolkata"), "19 Oct 2026, 01:30 Asia/Kolkata");
  assert.equal(validTimeZone("fake/zone"), false);
  assert.equal(metricTime("2026-10-18T20:00:00Z", "fake/zone"), "18 Oct 2026, 20:00 UTC");
  assert.equal(metricTime("invalid"), "Unavailable");
});
