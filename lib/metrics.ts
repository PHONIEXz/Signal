export const FREE_POST_SAMPLE_LIMIT = 10;
export const PRO_POST_SAMPLE_LIMIT = 100;
export const POST_SAMPLE_OPTIONS = [5, 10, 25, 50, 100] as const;
export const MIN_SIGNAL_SCORE_CONFIDENCE = 50;

export type Plan = "FREE" | "PRO";
export type MetricValue = number | null;

export type PostMetricInput = {
  likeCount: number;
  viewCount: number;
  replyCount: number;
  retweetCount: number;
  quoteCount?: number;
};

export type PostMetricSummary = {
  likes: MetricValue;
  views: MetricValue;
  engagements: MetricValue;
  engagementRate: MetricValue;
  postsAnalyzed: number;
};

export function normalizePlan(plan: string | null | undefined): Plan {
  return plan?.toUpperCase() === "PRO" ? "PRO" : "FREE";
}

export function sampleLimitForPlan(plan: string | null | undefined) {
  return normalizePlan(plan) === "PRO"
    ? PRO_POST_SAMPLE_LIMIT
    : FREE_POST_SAMPLE_LIMIT;
}

export function normalizeSampleSize(
  requested: string | number | null | undefined,
  plan: string | null | undefined
) {
  const parsed = typeof requested === "number" ? requested : Number(requested);
  const selected = POST_SAMPLE_OPTIONS.includes(parsed as (typeof POST_SAMPLE_OPTIONS)[number])
    ? parsed
    : FREE_POST_SAMPLE_LIMIT;

  return Math.min(selected, sampleLimitForPlan(plan));
}

export function calculateEngagementRate(
  engagements: MetricValue,
  views: MetricValue
): MetricValue {
  if (engagements === null || views === null || views <= 0) return null;
  return (engagements / views) * 100;
}

export function calculateChange(
  current: MetricValue,
  previous: MetricValue
): MetricValue {
  if (current === null || previous === null) return null;
  return current - previous;
}

export function calculateChangePercent(
  current: MetricValue,
  previous: MetricValue
): MetricValue {
  if (current === null || previous === null || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function summarizePosts(
  posts: PostMetricInput[],
  platform?: string
): PostMetricSummary {
  if (posts.length === 0) {
    return {
      likes: null,
      views: null,
      engagements: null,
      engagementRate: null,
      postsAnalyzed: 0,
    };
  }

  const likes = posts.reduce((sum, post) => sum + post.likeCount, 0);
  const engagements = posts.reduce(
    (sum, post) =>
      sum +
      post.likeCount +
      post.replyCount +
      post.retweetCount +
      (post.quoteCount ?? 0),
    0
  );
  const views =
    platform === "facebook"
      ? null
      : posts.reduce((sum, post) => sum + post.viewCount, 0);

  return {
    likes,
    views,
    engagements,
    engagementRate: calculateEngagementRate(engagements, views),
    postsAnalyzed: posts.length,
  };
}

export function sumAvailable(values: MetricValue[]) {
  const known = values.filter((value): value is number => value !== null);
  return {
    value: known.length ? known.reduce((sum, value) => sum + value, 0) : null,
    complete: known.length === values.length,
    knownCount: known.length,
  };
}

export type SignalScoreInput = {
  engagementRate: MetricValue;
  followerGrowthRate: MetricValue;
  postsLast30Days: MetricValue;
  averageViewsPerPost: MetricValue;
  followers: MetricValue;
};

export type SignalScoreResult = {
  score: number | null;
  confidence: number;
  engagement: { value: number | null; max: 40 };
  growth: { value: number | null; max: 25 };
  activity: { value: number | null; max: 20 };
  reach: { value: number | null; max: 15 };
};

export function calculateSignalScore(input: SignalScoreInput): SignalScoreResult {
  const engagement =
    input.engagementRate === null
      ? null
      : Math.round(Math.min(40, Math.max(0, input.engagementRate * 4)));
  const growth =
    input.followerGrowthRate === null
      ? null
      : Math.round(
          Math.min(25, Math.max(0, 5 + input.followerGrowthRate * 2))
        );
  const activity =
    input.postsLast30Days === null
      ? null
      : Math.round(
          Math.min(20, Math.max(0, (input.postsLast30Days / 12) * 20))
        );
  const reach =
    input.averageViewsPerPost === null ||
    input.followers === null ||
    input.followers <= 0
      ? null
      : Math.round(
          Math.min(15, Math.max(0, (input.averageViewsPerPost / input.followers) * 15))
        );

  const components = [
    { value: engagement, max: 40 },
    { value: growth, max: 25 },
    { value: activity, max: 20 },
    { value: reach, max: 15 },
  ];
  const available = components.filter(
    (component): component is { value: number; max: number } =>
      component.value !== null
  );
  const availableMax = available.reduce((sum, component) => sum + component.max, 0);
  const earned = available.reduce((sum, component) => sum + component.value, 0);

  return {
    score:
      availableMax >= MIN_SIGNAL_SCORE_CONFIDENCE
        ? Math.round((earned / availableMax) * 100)
        : null,
    confidence: availableMax,
    engagement: { value: engagement, max: 40 },
    growth: { value: growth, max: 25 },
    activity: { value: activity, max: 20 },
    reach: { value: reach, max: 15 },
  };
}
