export type Counts = {
  likeCount: number | null;
  viewCount: number | null;
  replyCount: number | null;
  retweetCount: number | null;
  quoteCount: number | null;
};
export type CollectedPost = Counts & { id: string; text: string; url: string | null; postedAt: Date | null };
export const COUNT_FIELDS = ["likeCount", "viewCount", "replyCount", "retweetCount", "quoteCount"] as const;
export function measured(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 2147483647 ? value : null;
}
export function metricDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
export function postEngagement(post: Counts): number | null {
  const values = [post.likeCount, post.replyCount, post.retweetCount, post.quoteCount];
  return values.some(v => v === null) ? null : values.reduce<number>((sum, v) => sum + (v ?? 0), 0);
}
export function completeSum(values: (number | null)[]): number | null {
  return !values.length || values.some(v => v === null) ? null : measured(values.reduce<number>((sum, v) => sum + (v ?? 0), 0));
}
export function missingCountFields(posts: Counts[]) {
  return COUNT_FIELDS.filter(field => posts.some(post => post[field] === null));
}
export function measurementDelta(current: Counts & { source: string; capturedAt: Date }, previous: (Counts & { source: string; capturedAt: Date }) | undefined) {
  if (!previous || current.source !== previous.source || current.capturedAt <= previous.capturedAt || current.source === "LEGACY") return null;
  return Object.fromEntries(COUNT_FIELDS.map(field => [field, current[field] === null || previous[field] === null ? null : current[field]! - previous[field]!]));
}
