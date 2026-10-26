export type PerformancePost = {
  id: string; text: string; postedAt: Date | null; fetchedAt: Date;
  likeCount: number | null; viewCount: number | null; replyCount: number | null;
};
export type PerformanceMetric = 'likes' | 'views' | 'comments';
export function performanceMetric(value?: string): PerformanceMetric {
  return value === 'views' || value === 'comments' ? value : 'likes';
}
export function rankContent(posts: PerformancePost[], metric: PerformanceMetric, platform: string, status: string) {
  const field = metric === 'views' ? 'viewCount' : metric === 'comments' ? 'replyCount' : 'likeCount';
  const supported = ['AVAILABLE', 'PARTIAL'].includes(status) && !(metric === 'views' && platform === 'facebook');
  const measured = supported ? posts.filter(p => p[field] !== null && Number.isSafeInteger(p[field]) && p[field]! >= 0) : [];
  const ranked = measured.toSorted((a,b) => b[field]! - a[field]! || a.id.localeCompare(b.id));
  const topValue = ranked[0]?.[field] ?? null;
  return { supported, measured: measured.length, total: posts.length,
    tied: topValue === null ? 0 : ranked.filter(p => p[field] === topValue).length,
    leaders: ranked.slice(0,3).map(post => ({post, value:post[field]!})), topValue };
}
export function contentWindow(posts: PerformancePost[], snapshots: {fetchedAt:Date;followersCount:number}[], now:Date) {
  const start = now.getTime() - 30 * 86400000;
  const points = snapshots.filter(s=>s.fetchedAt.getTime() >= start && s.fetchedAt <= now)
    .toSorted((a,b)=>a.fetchedAt.getTime()-b.fetchedAt.getTime());
  const first=points[0],last=points.at(-1);
  if(!first || !last || first.fetchedAt.getTime()===last.fetchedAt.getTime())return null;
  return {first:first.fetchedAt,last:last.fetchedAt,delta:last.followersCount-first.followersCount,
    posts:posts.filter(p=>p.postedAt && p.postedAt>=first.fetchedAt && p.postedAt<=last.fetchedAt)};
}
