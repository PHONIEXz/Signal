import type { GrowthPoint } from './growth-chart.ts';

/** Compare observations inside the window, never infer an absent boundary. */
export function channelComparison(data: GrowthPoint[], days: number, asOf: string) {
  const end = Date.parse(asOf);
  const start = end - days * 86400000;
  const points = data.filter(p => Date.parse(p.date) >= start && Date.parse(p.date) <= end)
    .toSorted((a,b) => Date.parse(a.date) - Date.parse(b.date));
  const first = points[0];
  const last = points.at(-1);
  const valid = (n: number | null | undefined): n is number => n !== null && n !== undefined && Number.isFinite(n) && n >= 0;
  const paired = !!first && !!last && Date.parse(last.date) > Date.parse(first.date) && valid(first.followers) && valid(last.followers);
  const delta = paired ? last!.followers! - first!.followers! : null;
  return { first: first?.date ?? null, last: last?.date ?? null, count: points.length,
    followers: valid(last?.followers) ? last!.followers : null,
    delta, percent: delta !== null && first!.followers! > 0 ? delta / first!.followers! * 100 : null,
    stale: !!last && end - Date.parse(last.date) > 86400000 };
}
