"use client";

import type { SignalScoreResult } from "@/lib/metrics";

export default function SignalScore({ result }: { result: SignalScoreResult }) {
  const score = result.score;

  function label() {
    if (score === null) return "Waiting for data";
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Strong";
    if (score >= 50) return "Growing";
    if (score >= 30) return "Needs attention";
    return "Early stage";
  }

  return (
    <div className="surface-card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-navy/[0.06] blur-3xl" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-display text-lg font-medium text-ink">Signal Score</p>
          <p className="mt-1 text-sm text-ink-muted">
            Size-neutral account health from available recent data
          </p>
        </div>
        <div className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink">
          {label()}
        </div>
      </div>

      <div className="relative mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div
          className="relative mx-auto flex h-32 w-32 shrink-0 items-center justify-center rounded-full p-[9px] shadow-inner sm:mx-0"
          style={{ background: `conic-gradient(var(--color-navy) ${(score ?? 0) * 3.6}deg, color-mix(in srgb, var(--color-navy) 10%, transparent) 0deg)` }}
          role="img"
          aria-label={score === null ? "Signal Score unavailable" : `Signal Score ${score} out of 100`}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-surface shadow-sm">
            <div className="text-center">
            <p className="font-display text-3xl font-semibold text-ink">
              {score ?? "--"}
            </p>
            <p className="text-[10px] text-ink-muted">/ 100</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <ScoreRow label="Engagement" {...result.engagement} />
          <ScoreRow label="Follower growth" {...result.growth} />
          <ScoreRow label="30-day activity" {...result.activity} />
          <ScoreRow label="Reach" {...result.reach} />
        </div>
      </div>

      <p className="mt-5 text-xs text-ink-muted">
        Data confidence: {result.confidence}%. Unavailable metrics are excluded instead of scored as zero.
      </p>
    </div>
  );
}

function ScoreRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number | null;
  max: number;
}) {
  const percentage = value === null ? 0 : Math.round((value / max) * 100);

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="font-medium text-ink">
          {value === null ? "Unavailable" : `${value}/${max}`}
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
