import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAccountEvidence,
  buildPostEvidence,
  cleanAiText,
} from "./signal-intelligence.ts";

const snapshots = [
  {
    followersCount: 120,
    followingCount: 80,
    postCount: 45,
    postsAnalyzed: 2,
    sampleSize: 5,
    postMetricsStatus: "AVAILABLE",
    fetchedAt: new Date("2026-09-14T12:00:00.000Z"),
  },
  {
    followersCount: 100,
    followingCount: 82,
    postCount: 43,
    postsAnalyzed: 2,
    sampleSize: 5,
    postMetricsStatus: "AVAILABLE",
    fetchedAt: new Date("2026-09-10T12:00:00.000Z"),
  },
  {
    followersCount: 90,
    followingCount: 85,
    postCount: 40,
    postsAnalyzed: 2,
    sampleSize: 5,
    postMetricsStatus: "AVAILABLE",
    fetchedAt: new Date("2026-09-01T12:00:00.000Z"),
  },
];

const posts = [
  {
    text: "First post",
    likeCount: 20,
    viewCount: 200,
    replyCount: 3,
    retweetCount: 4,
    quoteCount: 1,
    postedAt: new Date("2026-09-14T10:00:00.000Z"),
    tags: "education",
  },
  {
    text: "Second post",
    likeCount: 10,
    viewCount: 100,
    replyCount: 1,
    retweetCount: 2,
    quoteCount: 0,
    postedAt: new Date("2026-09-13T10:00:00.000Z"),
    tags: null,
  },
];

test("balanced evidence calculates deterministic changes and coverage", () => {
  const evidence = buildAccountEvidence({
    platform: "x",
    requestedSampleSize: 5,
    snapshots,
    posts,
  });

  assert.equal(evidence.mode, "balanced");
  assert.equal(evidence.sample.availablePosts, 2);
  assert.equal(evidence.sample.coveragePercent, 40);
  assert.equal(evidence.comparisons.followerChangeFromPrevious, 20);
  assert.equal(evidence.comparisons.followerChangePercentFromPrevious, 20);
  assert.equal(evidence.comparisons.followerChangeAcrossTrackedHistory, 30);
  assert.equal(evidence.recentPostSummary.engagements, 41);
  assert.equal(evidence.recentPostSummary.topPostEvidenceId, "P1");
  assert.equal(evidence.accountDnaSignals.historyReady, true);
  assert.equal(evidence.accountDnaSignals.contentSampleReady, false);
});

test("facebook evidence never presents unavailable views as zero", () => {
  const evidence = buildAccountEvidence({
    platform: "facebook",
    requestedSampleSize: 5,
    snapshots,
    posts,
  });

  assert.equal(evidence.recentPostSummary.views, null);
  assert.equal(evidence.recentPosts[0].views, null);
  assert.ok(
    evidence.dataConfidence.limitations.some((limitation) =>
      limitation.includes("view counts are not available")
    )
  );
});

test("an unavailable metric status hides stale view totals", () => {
  const evidence = buildAccountEvidence({
    platform: "x",
    requestedSampleSize: 5,
    snapshots: [
      { ...snapshots[0], postMetricsStatus: "UNAVAILABLE" },
      snapshots[1],
      snapshots[2],
    ],
    posts,
  });

  assert.equal(evidence.recentPostSummary.views, null);
  assert.equal(evidence.recentPostSummary.engagementRateByViews, null);
  assert.equal(evidence.recentPosts[0].views, null);
});

test("single-post evidence marks causation and missing account data limits", () => {
  const evidence = buildPostEvidence({
    platform: "x",
    post: posts[0],
    latestSnapshot: null,
  });

  assert.equal(evidence.dataConfidence.label, "limited");
  assert.equal(evidence.accountAtLatestSnapshot, null);
  assert.equal(evidence.dataConfidence.limitations.length, 2);
});

test("AI text cleanup removes long dash characters", () => {
  assert.equal(cleanAiText("Signal — clear – useful"), "Signal - clear - useful");
});

test("partial evidence retains measured views and zeros while identifying CSV and missing counts", () => {
  const evidence = buildAccountEvidence({
    platform: "x", requestedSampleSize: 5,
    snapshots: [{ ...snapshots[0], postMetricsStatus: "PARTIAL" }],
    posts: [{ ...posts[0], likeCount: 0, replyCount: null, measurements: [{ source: "CSV", capturedAt: new Date("2026-09-14T12:00:00Z") }] }],
  });
  assert.equal(evidence.recentPostSummary.views, 200);
  assert.equal(evidence.recentPostSummary.likes, 0);
  assert.equal(evidence.recentPostSummary.engagements, null);
  assert.equal(evidence.recentPostSummary.averageEngagementsPerAvailablePost, null);
  assert.equal(evidence.recentPosts[0].source, "CSV");
  assert.equal(evidence.recentPosts[0].measuredAt, "2026-09-14T12:00:00.000Z");
  assert.ok(evidence.dataConfidence.score <= 70);
  assert.ok(evidence.dataConfidence.limitations.some(limit => limit.includes("user-supplied")));
});
