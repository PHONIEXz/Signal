import type { AiReport } from "./ai-report.ts";

export type ReportState = { report: AiReport | null; receivedAt: string | null; loading: boolean; error: string };
export const initialReportState: ReportState = { report: null, receivedAt: null, loading: false, error: "" };
type Action = { type: "start" } | { type: "success"; report: AiReport; receivedAt: string } | { type: "failure"; error: string };
export function reportReducer(state: ReportState, action: Action): ReportState {
  if (action.type === "start") return { ...state, loading: true, error: "" };
  if (action.type === "success") return { report: action.report, receivedAt: action.receivedAt, loading: false, error: "" };
  return { ...state, loading: false, error: action.error };
}
export function reportText(report: AiReport, scope: string, sampleSize: number, receivedAt: string) {
  const clean = (text: string) => text.replace(/[—–]/g, "-");
  const group = (title: string, items: string[]) => `${title}\n${items.length ? items.map((item, index) => `${index + 1}. ${clean(item)}`).join("\n\n") : "No items provided."}`;
  return [
    "SOCIALPANORA AI REPORT", `Account scope: ${clean(scope)}`,
    `Requested recent-post sample: ${sampleSize} per account (actual available posts may be fewer)`,
    `Report received at (UTC): ${receivedAt}`,
    "AI-generated analysis of saved data. Review against the performance snapshot and account history. Missing metrics are not zero; recommendations are not guarantees. The received time is not the measurement time.",
    `SUMMARY\n${clean(report.summary)}`,
    group("WHAT IS WORKING", report.wins), group("OPPORTUNITIES", report.opportunities), group("NEXT ACTIONS", report.actions),
    "PLATFORM NOTES\n" + (report.platformNotes.length ? report.platformNotes.map(note => `${clean(note.platform)}: ${clean(note.headline)}\n${clean(note.detail)}`).join("\n\n") : "No platform notes provided."),
  ].join("\n\n") + "\n";
}
