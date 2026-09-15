import assert from "node:assert/strict";
import test from "node:test";
import { retrieveFacebookPosts, xPostsWarning } from "./post-retrieval.ts";
import { buildAccountEvidence, buildPostEvidence } from "./signal-intelligence.ts";

test("Facebook field restrictions retry basic content without inventing engagement", async () => {
  const urls: URL[] = [];
  const mock: typeof fetch = async (input, init) => {
    const url = new URL(String(input)); urls.push(url);
    assert.equal(init?.cache, "no-store");
    assert.equal(url.searchParams.get("limit"), "10");
    return urls.length === 1 ? Response.json({ error: { code: 10 } }, { status: 403 }) : Response.json({ data: [{ id: "page_post", message: "Actual content" }] });
  };
  const result = await retrieveFacebookPosts("page", "mock-token", 10, mock);
  assert.equal(result.posts?.[0].message, "Actual content");
  assert.equal(result.contentOnly, true);
  assert.equal(result.posts?.[0].reactions, undefined);
  assert.match(result.warning!, /unavailable, not zero/);
  assert.match(urls[0].searchParams.get("fields")!, /comments.limit\(0\)/);
  assert.equal(urls[1].searchParams.get("fields"), "id,message,created_time,permalink_url");
});

test("Facebook rate limits do not retry and genuine empty data is separate from failure", async () => {
  let attempts = 0;
  const limited = await retrieveFacebookPosts("page", "mock", 5, async () => { attempts++; return Response.json({ error: { code: 4 } }, { status: 429 }); });
  assert.equal(attempts, 1); assert.equal(limited.posts, null); assert.match(limited.warning!, /rate limited/);
  const empty = await retrieveFacebookPosts("page", "mock", 5, async () => Response.json({ data: [] }));
  assert.deepEqual(empty.posts, []);
  const failed = await retrieveFacebookPosts("page", "mock", 5, async () => { throw new Error("private diagnostic"); });
  assert.equal(failed.posts, null); assert.doesNotMatch(failed.warning!, /private diagnostic/);
});

test("X failures identify credit, token, permission and rate-limit problems", () => {
  assert.match(xPostsWarning(402), /credits/); assert.match(xPostsWarning(401), /Reconnect/);
  assert.match(xPostsWarning(403), /tweet.read/); assert.match(xPostsWarning(429), /rate limited/);
});

test("Facebook successful responses distinguish omitted counts from measured zero", async () => {
  const incomplete = await retrieveFacebookPosts("page", "mock", 10, async () => Response.json({ data: [{ id: "p", message: "Content" }] }));
  assert.equal(incomplete.contentOnly, true);
  const measured = await retrieveFacebookPosts("page", "mock", 10, async () => Response.json({ data: [{ id: "p", reactions: { summary: { total_count: 0 } }, comments: { summary: { total_count: 0 } } }] }));
  assert.equal(measured.contentOnly, false);
  assert.equal(measured.warning, null);
});

test("content-only Facebook evidence does not turn stored count defaults into real metrics", () => {
  const post = { text: "Actual post", likeCount: 0, viewCount: 0, replyCount: 0, retweetCount: 0, quoteCount: 0, postedAt: null };
  const snapshot = { followersCount: 20, followingCount: null, postCount: null, postsAnalyzed: 1, sampleSize: 10, postMetricsStatus: "CONTENT_ONLY", fetchedAt: new Date() };
  const evidence = buildAccountEvidence({ platform: "facebook", requestedSampleSize: 10, snapshots: [snapshot], posts: [post] });
  assert.equal(evidence.recentPosts[0].text, post.text);
  assert.equal(evidence.recentPosts[0].likes, null);
  assert.equal(evidence.recentPostSummary.likes, null);
  assert.equal(evidence.recentPostSummary.averageLikesPerAvailablePost, null);
  assert.equal(evidence.recentPostSummary.topPostEvidenceId, null);
  assert.equal(buildPostEvidence({ platform: "facebook", post, latestSnapshot: snapshot }).post.replies, null);
});
