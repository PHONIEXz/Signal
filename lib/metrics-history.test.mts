import test from "node:test";
import assert from "node:assert/strict";
import { measured, completeSum, measurementDelta, postEngagement } from "./metric-measurements.ts";
import { collectPosts, collectPageInsights } from "./metrics-collector.ts";
import { parseMetricCsv } from "./metrics-csv.ts";

function responses(items: { status?: number; data: unknown }[]) {
  const calls: { url: URL; init?: RequestInit }[] = [];
  const fetcher = (async (url, init) => {
    calls.push({ url: new URL(String(url)), init });
    const item = items.shift(); assert.ok(item, "Unexpected extra API request");
    assert.equal(new URL(String(url)).searchParams.has("access_token"), false);
    assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-only");
    return Response.json(item.data, { status: item.status ?? 200 });
  }) as typeof fetch;
  return { calls, fetcher };
}
const zero = { likeCount: 0, viewCount: 0, replyCount: 0, retweetCount: 0, quoteCount: 0 };

test("unknown counts differ from measured zero; deltas need the same source and ordered times", () => {
  for (const value of [undefined, null, "0", -1, NaN, Infinity, 0.5, 2147483648]) assert.equal(measured(value), null);
  assert.equal(measured(0), 0); assert.equal(completeSum([0, 0]), 0);
  assert.equal(completeSum([]), null); assert.equal(completeSum([0, null]), null);
  assert.equal(completeSum([2147483647, 1]), null);
  assert.equal(postEngagement({ ...zero, replyCount: null }), null);
  const current = { ...zero, source: "API", capturedAt: new Date("2026-09-02") };
  const previous = { ...zero, likeCount: 2, source: "API", capturedAt: new Date("2026-09-01") };
  assert.equal(measurementDelta(current, previous)?.likeCount, -2);
  assert.equal(measurementDelta(current, { ...previous, source: "CSV" }), null);
  assert.equal(measurementDelta(current, { ...previous, capturedAt: current.capturedAt }), null);
  assert.equal(measurementDelta(current, undefined), null);
  assert.equal(measurementDelta({ ...current, viewCount: null }, previous)?.viewCount, null);
});

test("X paginates and deduplicates while preserving missing measurements", async () => {
  const { calls, fetcher } = responses([
    { data: { data: [{ id: "1", text: "one", public_metrics: { like_count: 0 } }], meta: { next_token: "next" } } },
    { data: { data: [{ id: "1" }, { id: "2" }], meta: {} } },
  ]);
  const result = await collectPosts("x", "owner", "test-only", 10, fetcher);
  assert.equal(result.complete, true); assert.equal(result.posts.length, 2);
  assert.equal(calls[1].url.searchParams.get("pagination_token"), "next");
  assert.equal(result.posts[0].likeCount, 0); assert.equal(result.posts[0].viewCount, null);
  assert.equal(result.posts[1].likeCount, null);
});

test("failed later pages retain earlier posts and never retry a rate limit", async () => {
  const { calls, fetcher } = responses([
    { data: { data: [{ id: "1" }], meta: { next_token: "next" } } },
    { status: 429, data: { error: "limited" } },
  ]);
  const result = await collectPosts("x", "owner", "test-only", 10, fetcher);
  assert.equal(result.complete, false); assert.equal(result.posts.length, 1);
  assert.equal(calls.length, 2); assert.match(result.warning!, /limit/i);
});

test("Facebook restricted engagement falls back to content without invented counts", async () => {
  const { calls, fetcher } = responses([
    { status: 403, data: { error: { code: 200 } } },
    { data: { data: [{ id: "1_2", message: "Page post" }], paging: { next: "https://untrusted.example", cursors: { after: "safe-cursor" } } } },
    { data: { data: [{ id: "1_3" }] } },
  ]);
  const result = await collectPosts("facebook", "1", "test-only", 10, fetcher);
  assert.equal(result.posts.length, 2); assert.equal(result.posts[0].likeCount, null);
  assert.equal(result.posts[0].retweetCount, null); assert.equal(result.posts[0].viewCount, null);
  assert.equal(calls[2].url.host, "graph.facebook.com");
  assert.equal(calls[2].url.searchParams.get("after"), "safe-cursor");
  assert.equal(calls[1].url.searchParams.get("fields"), "id,message,created_time,permalink_url");
});

test("missing Facebook shares and missing next cursors remain unavailable", async () => {
  const { calls, fetcher } = responses([{ data: { data: [{ id: "1_2", reactions: { summary: { total_count: 0 } } }], paging: { next: "exists" } } }]);
  const result = await collectPosts("facebook", "1", "test-only", 10, fetcher);
  assert.equal(result.posts[0].likeCount, 0); assert.equal(result.posts[0].retweetCount, null);
  assert.equal(result.complete, false); assert.match(result.warning!, /cursor/);
  assert.match(calls[0].url.searchParams.get("fields")!, /reactions\.limit\(0\)\.summary\(true\)/);
  assert.match(calls[0].url.searchParams.get("fields")!, /comments\.limit\(0\)\.summary\(true\)/);
});

test("TikTok advances cursors, bounds pages and detects stalled pagination", async () => {
  const { calls, fetcher } = responses([
    { data: { data: { videos: [{ id: "11", like_count: 0, create_time: null }], has_more: true, cursor: 9 }, error: { code: "ok" } } },
    { data: { data: { videos: [{ id: "12" }], has_more: true, cursor: 9 }, error: { code: "ok" } } },
  ]);
  const result = await collectPosts("tiktok", "owner", "test-only", 25, fetcher);
  assert.equal(JSON.parse(calls[0].init!.body as string).max_count, 20);
  assert.equal(JSON.parse(calls[1].init!.body as string).cursor, 9);
  assert.equal(result.complete, false); assert.equal(result.posts.length, 2);
  assert.equal(result.posts[0].postedAt, null);
});

test("Page Insights remain separate and zero is a valid daily Page measurement", async () => {
  const { fetcher } = responses([{ data: { data: [{ name: "page_media_view", period: "day", values: [{ value: 0, end_time: "2026-09-01T00:00:00Z" }, { value: {}, end_time: "2026-09-02" }] }] } }]);
  const result = await collectPageInsights("owner", "test-only", fetcher);
  assert.equal(result.values.length, 1); assert.equal(result.values[0].value, 0);
  const denied = responses([{ status: 400, data: { error: { code: 100 } } }]);
  const unavailable = await collectPageInsights("owner", "test-only", denied.fetcher);
  assert.equal(unavailable.values.length, 0); assert.equal(unavailable.warnings.length, 1);
});

test("CSV parses quotes/newlines and blanks, with Facebook reaction semantics", () => {
  const posts = parseMetricCsv('\uFEFFplatform_post_id,text,likes,views,comments,shares,quotes\r\n1,"comma, and ""quote""\nline",0,,2,0,0', "x", 10);
  assert.equal(posts[0].text, 'comma, and "quote"\nline');
  assert.equal(posts[0].likeCount, 0); assert.equal(posts[0].viewCount, null);
  const fb = parseMetricCsv("platform_post_id,text,likes,reactions,views\n1_2,Page post,999,0,800", "facebook", 10)[0];
  assert.equal(fb.likeCount, 0); assert.equal(fb.viewCount, null);
  for (const csv of ["platform_post_id,text,likes\n1,one,-2", "platform_post_id,text\n1,a\n1,b", 'platform_post_id,text\n1,"unfinished', "platform_post_id,text,posted_at\n1,a,invalid", "platform_post_id,text\n1,a\n2,b"]) assert.throws(() => parseMetricCsv(csv, "x", 1));
  assert.throws(() => parseMetricCsv("platform_post_id,text\n1_2,a", "x", 10));
});

test("request origin uses the deployment Host rather than an internal or forwarded hostname", async () => {
  const { requestOrigin, readAuthBody } = await import("./auth-http.ts");
  const environment = process.env as Record<string, string | undefined>;
  const previousMode = environment.NODE_ENV;
  const previousUrl = process.env.APP_URL;
  process.env.APP_URL = "https://signal.example";
  environment.NODE_ENV = "production";
  const make = (origin: string) => new Request("http://localhost:3456/api/metrics/import/x", { method: "POST", headers: { host: "127.0.0.1:3456", origin, "content-type": "application/json", "x-forwarded-host": "untrusted.example" }, body: "{}" });
  try {
    const valid = make("http://127.0.0.1:3456");
    assert.equal(requestOrigin(valid), "http://127.0.0.1:3456");
    assert.deepEqual(await readAuthBody(valid, 4096, requestOrigin(valid)), {});
    const foreign = make("https://untrusted.example");
    await assert.rejects(readAuthBody(foreign, 4096, requestOrigin(foreign)), /submit this form/);
  } finally { if (previousUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = previousUrl; if (previousMode === undefined) delete environment.NODE_ENV; else environment.NODE_ENV = previousMode; }
});
