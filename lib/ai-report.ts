function text(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 6000;
}
function list(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 10 && value.every(text);
}
export function validAiReport(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const report = value as Record<string, unknown>;
  return text(report.summary) && list(report.wins) && list(report.opportunities) && list(report.actions) &&
    Array.isArray(report.platformNotes) && report.platformNotes.length <= 10 && report.platformNotes.every(note =>
      note && typeof note === "object" && text(note.platform) && text(note.headline) && text(note.detail));
}
