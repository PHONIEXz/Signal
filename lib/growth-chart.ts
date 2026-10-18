/** Keep small changes visible without turning missing measurements into zeroes. */
export function growthRange(values: number[], fromZero = false): [number, number] {
  const valid = values.filter(value => Number.isFinite(value) && value >= 0);
  if (!valid.length) return [0, 1];
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const padding = Math.max(1, Math.ceil((max - min) * 0.15));
  return [fromZero ? 0 : Math.max(0, min - padding), max + padding];
}

export const growthPeriods = ["hourly", "daily", "weekly", "monthly", "yearly"] as const;
export type GrowthPeriod = typeof growthPeriods[number];
export type GrowthPoint = { date: string; followers: number | null; likes: number | null; views: number | null; posts: number | null };
const counts: Record<GrowthPeriod, number> = { hourly: 24, daily: 30, weekly: 12, monthly: 12, yearly: 5 };
export const periodDescriptions: Record<GrowthPeriod, string> = {
  hourly: "24 hours", daily: "30 days", weekly: "12 weeks", monthly: "12 months", yearly: "5 years",
};
function bucketStart(time: number, period: GrowthPeriod): number {
  const date = new Date(time);
  date.setUTCMinutes(0, 0, 0);
  if (period !== "hourly") date.setUTCHours(0);
  if (period === "weekly") date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  if (period === "monthly" || period === "yearly") date.setUTCDate(1);
  if (period === "yearly") date.setUTCMonth(0);
  return date.getTime();
}
function shift(time: number, period: GrowthPeriod, amount: number): number {
  const date = new Date(time);
  if (period === "yearly") date.setUTCFullYear(date.getUTCFullYear() + amount);
  else if (period === "monthly") date.setUTCMonth(date.getUTCMonth() + amount);
  else if (period === "weekly") date.setUTCDate(date.getUTCDate() + 7 * amount);
  else if (period === "daily") date.setUTCDate(date.getUTCDate() + amount);
  else date.setUTCHours(date.getUTCHours() + amount);
  return date.getTime();
}
/** Counters are snapshots, never summed. Missing buckets remain explicit gaps. */
export function groupGrowth(data: GrowthPoint[], period: GrowthPeriod, asOf?: string) {
  const sorted = data.filter(point => Number.isFinite(Date.parse(point.date)))
    .toSorted((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const latest = sorted.at(-1);
  if (!latest) return [];
  const anchor = asOf && Number.isFinite(Date.parse(asOf)) ? Math.max(Date.parse(asOf), Date.parse(latest.date)) : Date.parse(latest.date);
  const end = bucketStart(anchor, period);
  const first = Math.max(bucketStart(Date.parse(sorted[0].date), period), shift(end, period, 1 - counts[period]));
  const buckets = new Map<number, GrowthPoint>();
  for (const point of sorted) buckets.set(bucketStart(Date.parse(point.date), period), point);
  const result = [];
  for (let timestamp = first; timestamp <= end; timestamp = shift(timestamp, period, 1)) {
    const point = buckets.get(timestamp);
    result.push({ timestamp, date: point?.date ?? new Date(timestamp).toISOString(), captured: !!point,
      followers: point?.followers ?? null, likes: point?.likes ?? null, views: point?.views ?? null, posts: point?.posts ?? null });
  }
  return result;
}

/** Axis ticks must be real bucket boundaries, not interpolated times. */
export function growthTicks(points: {timestamp: number}[], maximum = 5): number[] {
  if (points.length <= maximum) return points.map(point=>point.timestamp);
  return Array.from({length:maximum}, (_, index) => points[Math.round(index * (points.length - 1) / (maximum - 1))].timestamp);
}

/** Compare actual observations across gaps without inventing intervening values. */
export function recordedComparison(points: ReturnType<typeof groupGrowth>, metric: keyof Omit<GrowthPoint,"date">) {
  const current = points.findLast(point=>point.captured);
  const previous = current ? points.slice(0,points.indexOf(current)).findLast(point=>point[metric] !== null) : undefined;
  const currentValue = current?.[metric] ?? null;
  const previousValue = previous?.[metric] ?? null;
  const change = currentValue !== null && previousValue !== null ? currentValue - previousValue : null;
  return {current,previous,change,percentage:change !== null && previousValue !== null && previousValue > 0 ? change / previousValue * 100 : null};
}
