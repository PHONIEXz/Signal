import { measured, metricDate, type CollectedPost } from "./metric-measurements.ts";
import { facebookApiErrorCode } from "./platform-data.ts";
import { xPostsWarning } from "./post-retrieval.ts";

export type Collection = { posts: CollectedPost[]; complete: boolean; warning: string | null; requests: number };
export async function collectPosts(platform: string, userId: string, token: string, limit: number, fetcher: typeof fetch = fetch): Promise<Collection> {
  const posts: CollectedPost[] = [];
  const ids = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | number | undefined;
  let requests = 0;
  let basic = false;
  let warning: string | null = null;
  // Meta's field expansion expects summary(true). Asking for
  // summary(total_count) causes current Graph API versions to reject the
  // complete field set, which previously made Signal fall back to content-only
  // posts even when the Page token had pages_read_engagement access.
  const fields = "id,message,created_time,permalink_url,reactions.limit(0).summary(true),comments.limit(0).summary(true),shares";
  try {
    while (posts.length < limit && requests < 10) {
      const remaining = limit - posts.length;
      const url = new URL(platform === "x" ? `https://api.x.com/2/users/${userId}/tweets` : platform === "facebook" ? `https://graph.facebook.com/v26.0/${userId}/posts` : "https://open.tiktokapis.com/v2/video/list/");
      const init: RequestInit = { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10000) };
      if (platform === "x") {
        url.searchParams.set("max_results", String(Math.max(5, Math.min(100, remaining))));
        url.searchParams.set("tweet.fields", "public_metrics,created_at");
        if (cursor !== undefined) url.searchParams.set("pagination_token", String(cursor));
      } else if (platform === "facebook") {
        url.searchParams.set("fields", basic ? "id,message,created_time,permalink_url" : fields);
        url.searchParams.set("limit", String(remaining));
        if (cursor !== undefined) url.searchParams.set("after", String(cursor));
      } else {
        url.searchParams.set("fields", "id,title,video_description,create_time,share_url,like_count,comment_count,share_count,view_count");
        init.method = "POST";
        init.headers = { ...init.headers, "Content-Type": "application/json" };
        init.body = JSON.stringify({ max_count: Math.min(20, remaining), ...(cursor === undefined ? {} : { cursor }) });
      }
      requests++;
      const response = await fetcher(url, init);
      const data = await response.json().catch(() => null);
      if (!response.ok || (platform === "tiktok" && data?.error?.code && data.error.code !== "ok")) {
        const code = facebookApiErrorCode(data);
        if (platform === "facebook" && !basic && [10, 100, 200].includes(code ?? -1)) { basic = true; warning = "Facebook engagement fields are restricted. Basic post content is being collected."; continue; }
        warning = platform === "x" ? xPostsWarning(response.status) : platform === "facebook" ? code === 190 ? "Reconnect Facebook: the Page token is invalid." : code === 4 || code === 17 || code === 32 ? "Meta rate limited collection. Try again later." : "Meta rejected post reading. Check the Page and pages_read_engagement permission." : "TikTok rejected video reading. Check video.list permission and reconnect.";
        return { posts, complete: false, warning, requests };
      }
      const page = platform === "tiktok" ? data?.data?.videos : data?.data ?? (platform === "x" && data?.meta?.result_count === 0 ? [] : undefined);
      if (!Array.isArray(page) || page.some(p => !p || typeof p.id !== "string")) return { posts, complete: false, warning: "The platform returned an unexpected post response.", requests };
      for (const p of page) {
        if (ids.has(p.id) || posts.length >= limit) continue;
        ids.add(p.id);
        const m = p.public_metrics;
        posts.push({ id: p.id, text: platform === "x" ? p.text ?? "(No text)" : platform === "facebook" ? p.message ?? "(No text)" : p.video_description || p.title || "(No caption)",
          url: platform === "x" ? `https://x.com/i/web/status/${p.id}` : platform === "facebook" ? p.permalink_url ?? null : p.share_url ?? null,
          postedAt: platform === "tiktok" ? typeof p.create_time === "number" && Number.isFinite(p.create_time) && Math.abs(p.create_time) < 8640000000000 ? metricDate(new Date(p.create_time * 1000).toISOString()) : null : metricDate(platform === "x" ? p.created_at : p.created_time),
          likeCount: measured(platform === "x" ? m?.like_count : platform === "facebook" ? p.reactions?.summary?.total_count : p.like_count),
          viewCount: measured(platform === "x" ? m?.impression_count : platform === "facebook" ? null : p.view_count),
          replyCount: measured(platform === "x" ? m?.reply_count : platform === "facebook" ? p.comments?.summary?.total_count : p.comment_count),
          retweetCount: measured(platform === "x" ? m?.retweet_count : platform === "facebook" ? basic ? null : p.shares?.count : p.share_count),
          quoteCount: platform === "x" ? measured(m?.quote_count) : 0 });
      }
      const next = platform === "x" ? data?.meta?.next_token : platform === "facebook" ? data?.paging?.next ? data.paging?.cursors?.after : undefined : data?.data?.has_more ? data.data.cursor : undefined;
      const hasMore = platform === "facebook" ? Boolean(data?.paging?.next) : platform === "tiktok" ? Boolean(data?.data?.has_more) : Boolean(data?.meta?.next_token);
      if (posts.length < limit && hasMore && (next === undefined || next === null || next === "")) return { posts, complete: false, warning: "The platform omitted its next-page cursor.", requests };
      if (posts.length >= limit || next === undefined || next === null || next === "") return { posts, complete: true, warning, requests };
      if ((typeof next !== "string" && typeof next !== "number") || cursors.has(String(next)) || !page.length) return { posts, complete: false, warning: "Collection stopped because pagination did not advance.", requests };
      cursors.add(String(next)); cursor = next;
    }
    return { posts, complete: posts.length >= limit, warning: warning || "Collection stopped at its request safety limit.", requests };
  } catch { return { posts, complete: false, warning: "Platform collection timed out or could not connect. Cached posts were preserved.", requests }; }
}

export async function collectPageInsights(pageId: string, token: string, fetcher: typeof fetch = fetch) {
  // Each metric is isolated so an unsupported insight never blocks post collection.
  const values: { metric: string; period: string; periodEnd: Date; value: number }[] = [];
  const warnings: string[] = [];
  for (const metric of ["page_media_view"]) {
    try {
      const url = new URL(`https://graph.facebook.com/v26.0/${pageId}/insights`);
      url.searchParams.set("metric", metric); url.searchParams.set("period", "day");
      url.searchParams.set("since", String(Math.floor(Date.now()/1000) - 7*86400));
      url.searchParams.set("until", String(Math.floor(Date.now()/1000)));
      const response = await fetcher(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10000) });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data?.data)) { warnings.push(`${metric} unavailable: check read_insights and Page access.`); continue; }
      for (const item of data.data) {
        if (item.name !== metric || item.period !== "day" || !Array.isArray(item.values)) continue;
        for (const point of item.values) { const value = measured(point.value); const periodEnd = metricDate(point.end_time); if (value !== null && periodEnd) values.push({ metric, period: "day", periodEnd, value }); }
      }
      if (!values.some(v => v.metric === metric)) warnings.push(`${metric} returned no numeric daily measurements.`);
    } catch { warnings.push(`${metric} could not be retrieved; post collection was preserved.`); }
  }
  return { values, warnings };
}
