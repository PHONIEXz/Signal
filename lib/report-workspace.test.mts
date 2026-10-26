import { test } from "node:test";
import assert from "node:assert/strict";
import { initialReportState, reportReducer, reportText } from "./report-workspace.ts";
import { validAiReport } from "./ai-report.ts";
const report = { summary: "Limited saved history.", wins: ["Stable followers"], opportunities: ["Collect more observations"], actions: ["Review account history"], platformNotes: [{ platform: "X", headline: "Missing views", detail: "Do not infer poor reach." }] };
test("regeneration preserves prior report and timestamp during loading and failure", () => {
  const saved = reportReducer(initialReportState, { type: "success", report, receivedAt: "2026-10-26T10:00:00Z" });
  const loading = reportReducer(saved, { type: "start" });
  assert.equal(loading.report, report); assert.equal(loading.loading, true);
  const failed = reportReducer(loading, { type: "failure", error: "Provider unavailable" });
  assert.equal(failed.report, report); assert.equal(failed.receivedAt, saved.receivedAt); assert.equal(failed.loading, false);
  const next = { ...report, summary: "Replacement" };
  const replaced = reportReducer(failed, { type: "success", report: next, receivedAt: "2026-10-26T11:00:00Z" });
  assert.equal(replaced.report, next); assert.equal(replaced.error, "");
});
test("report export includes every section, scope, sample and honest timestamp context", () => {
  const text = reportText(report, "Example (x)", 10, "2026-10-26T10:00:00Z");
  for (const expected of ["Example (x)", "10 per account", "2026-10-26T10:00:00Z", report.summary, ...report.wins, ...report.opportunities, ...report.actions, report.platformNotes[0].detail, "not the measurement time"]) assert.ok(text.includes(expected));
});
test("malformed reports cannot pass validation before replacing the visible report", () => {
  assert.equal(validAiReport(report), true);
  assert.equal(validAiReport({ ...report, actions: [null] }), false);
  assert.equal(validAiReport({ summary: "Incomplete" }), false);
});
