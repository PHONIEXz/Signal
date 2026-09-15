"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Reading account signals",
  "Comparing recent performance",
  "Checking the evidence",
];

export default function SignalThinkingState({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const interval = window.setInterval(() => {
      setStep((current) => (current + 1) % STEPS.length);
    }, 420);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className={`signal-thinking flex items-center gap-3 rounded-xl border border-navy/10 bg-paper/70 ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
      role="status"
    >
      <span className="sr-only">Signal is analyzing your account data.</span>
      <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-action text-white shadow-sm shadow-navy/20">
        <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden="true">
          <path
            className="signal-thinking-wave"
            d="M5 20.5c3.4 0 3.4-9 6.8-9s3.4 12 6.8 12 3.4-15 6.8-15"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <circle
            className="signal-thinking-dot"
            cx="25.4"
            cy="8.5"
            r="2.4"
            fill="var(--color-amber)"
          />
        </svg>
      </span>

      <div className="min-w-0" aria-hidden="true">
        <p className="text-xs font-semibold text-ink">Signal is analyzing</p>
        <p key={step} className="signal-thinking-label mt-0.5 text-xs text-ink-muted">
          {STEPS[step]}
        </p>
      </div>

      <span className="ml-auto flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="signal-thinking-bubble h-1.5 w-1.5 rounded-full bg-navy/50"
            style={{ animationDelay: `${dot * 120}ms` }}
          />
        ))}
      </span>
    </div>
  );
}
