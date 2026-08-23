"use client";

type SignalScoreProps = {
  followers: number;
  posts: number;
  likes: number;
  views: number;
  engagementRate: number;
};

export default function SignalScore({
  followers,
  posts,
  likes,
  views,
  engagementRate,
}: SignalScoreProps) {
  /*
   * Signal Score is intentionally deterministic.
   *
   * Engagement:      40 points
   * Content activity: 25 points
   * Reach:            20 points
   * Audience:         15 points
   */

  const engagementScore = Math.min(
    40,
    Math.round(engagementRate * 4)
  );

  const activityScore = Math.min(
    25,
    posts > 50
      ? 25
      : Math.round((posts / 50) * 25)
  );

  const reachScore = Math.min(
    20,
    views > 0
      ? Math.round(
          Math.min(1, views / Math.max(followers * 10, 1)) * 20
        )
      : 0
  );

  const audienceScore = Math.min(
    15,
    followers > 1000
      ? 15
      : Math.round((followers / 1000) * 15)
  );

  const score = Math.min(
    100,
    engagementScore +
      activityScore +
      reachScore +
      audienceScore
  );

  const getLabel = () => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Strong";
    if (score >= 50) return "Growing";
    if (score >= 30) return "Needs attention";
    return "Early stage";
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-lg font-medium text-ink">
            Signal Score
          </p>

          <p className="mt-1 text-sm text-ink-muted">
            Overall account health
          </p>
        </div>

        <div className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink">
          {getLabel()}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-6">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[8px] border-navy/10">
          <div className="text-center">
            <p className="font-display text-3xl font-semibold text-ink">
              {score}
            </p>

            <p className="text-[10px] text-ink-muted">
              / 100
            </p>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <ScoreRow
            label="Engagement"
            value={engagementScore}
            max={40}
          />

          <ScoreRow
            label="Activity"
            value={activityScore}
            max={25}
          />

          <ScoreRow
            label="Reach"
            value={reachScore}
            max={20}
          />

          <ScoreRow
            label="Audience"
            value={audienceScore}
            max={15}
          />
        </div>
      </div>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-ink-muted">{label}</span>

        <span className="font-medium text-ink">
          {value}/{max}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-paper">
        <div
          className="h-full rounded-full bg-navy transition-all duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
