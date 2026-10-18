/** Explicit UTC gives server and browser the same metric timestamp. */
export function metricTime(value: string | Date | number) {
  return new Date(value).toLocaleString("en-GB", {timeZone:"UTC",dateStyle:"medium",timeStyle:"short"}) + " UTC";
}
