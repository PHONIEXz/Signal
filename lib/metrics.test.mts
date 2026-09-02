import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateChangePercent,
  calculateEngagementRate,
  calculateSignalScore,
  normalizeSampleSize,
  sumAvailable,
  summarizePosts,
} from "./metrics.ts";

test("free accounts cannot request more than 10 posts", () => {
  assert.equal(normalizeSampleSize(5, "FREE"), 5);
  assert.equal(normalizeSampleSize(10, "FREE"), 10);
  assert.equal(normalizeSampleSize(25, "FREE"), 10);
  assert.equal(normalizeSampleSize(100, undefined), 10);
});

test("pro accounts can use every supported post sample", () => {
  assert.equal(normalizeSampleSize(25, "PRO"), 25);
  assert.equal(normalizeSampleSize("50", "pro"), 50);
  assert.equal(normalizeSampleSize(100, "PRO"), 100);
  assert.equal(normalizeSampleSize(37, "PRO"), 10);
});

test("engagement rate stays unavailable without a valid view baseline", () => {
  assert.equal(calculateEngagementRate(null, 100), null);
  assert.equal(calculateEngagementRate(10, null), null);
  assert.equal(calculateEngagementRate(10, 0), null);
  assert.equal(calculateEngagementRate(20, 200), 10);
});

test("post summaries include likes, replies, reposts and quotes", () => {
  const posts = [
    {
      likeCount: 10,
      viewCount: 100,
      replyCount: 2,
      retweetCount: 3,
      quoteCount: 1,
    },
    {
      likeCount: 5,
      viewCount: 50,
      replyCount: 1,
      retweetCount: 0,
      quoteCount: 0,
    },
  ];

  assert.deepEqual(summarizePosts(posts, "x"), {
    likes: 15,
    views: 150,
    engagements: 22,
    engagementRate: (22 / 150) * 100,
    postsAnalyzed: 2,
  });
  assert.equal(summarizePosts(posts, "facebook").views, null);
});

test("no stored posts remain unavailable instead of becoming zero", () => {
  assert.deepEqual(summarizePosts([], "x"), {
    likes: null,
    views: null,
    engagements: null,
    engagementRate: null,
    postsAnalyzed: 0,
  });
});

test("partial totals expose their completeness", () => {
  assert.deepEqual(sumAvailable([4, null, 6]), {
    value: 10,
    complete: false,
    knownCount: 2,
  });
});

test("percentage change needs a real nonzero baseline", () => {
  assert.equal(calculateChangePercent(120, 100), 20);
  assert.equal(calculateChangePercent(10, 0), null);
  assert.equal(calculateChangePercent(null, 10), null);
});

test("Signal Score waits until at least half of its inputs are available", () => {
  const sparse = calculateSignalScore({
    engagementRate: null,
    followerGrowthRate: null,
    postsLast30Days: 12,
    averageViewsPerPost: null,
    followers: null,
  });

  assert.equal(sparse.score, null);
  assert.equal(sparse.confidence, 20);

  const complete = calculateSignalScore({
    engagementRate: 5,
    followerGrowthRate: 5,
    postsLast30Days: 6,
    averageViewsPerPost: 500,
    followers: 1000,
  });

  assert.equal(complete.score, 53);
  assert.equal(complete.confidence, 100);
});
