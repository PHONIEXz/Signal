/** Validate IANA zones before passing a saved preference to Intl. */
export function validTimeZone(value: string): boolean {
  try { new Intl.DateTimeFormat("en-GB", { timeZone: value }); return true; }
  catch { return false; }
}

export function metricTime(value: string | Date | number, timeZone = "UTC") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unavailable";
  const zone = validTimeZone(timeZone) ? timeZone : "UTC";
  const label = zone === "Africa/Lagos" ? "WAT" : zone;
  return date.toLocaleString("en-GB", {timeZone: zone, dateStyle:"medium", timeStyle:"short"}) + " " + label;
}
