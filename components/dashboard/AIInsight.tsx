"use client";

import { useEffect, useState } from "react";

export default function AIInsight({
  platform = "x",
}: {
  platform?: string;
}) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function generateInsight() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/insights/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ platform }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to generate insight"
        );
      }

      setInsight(data.insight);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generateInsight();
  }, [platform]);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✦</span>

            <p className="font-display text-lg font-medium text-ink">
              Signal AI
            </p>
          </div>

          <p className="mt-1 text-xs text-ink-muted">
            Your account, analyzed by Signal.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-connected" />

          <span className="text-xs text-ink-muted">
            AI
          </span>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            <div className="h-3 w-4/5 animate-pulse rounded bg-paper" />
            <div className="h-3 w-full animate-pulse rounded bg-paper" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-paper" />
          </div>
        ) : error ? (
          <div>
            <p className="text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={generateInsight}
              className="mt-3 text-xs font-medium text-ink underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        ) : (
          <p className="whitespace-pre-line text-sm leading-6 text-ink">
            {insight}
          </p>
        )}
      </div>

      {!loading && !error && (
        <button
          type="button"
          onClick={generateInsight}
          className="mt-5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
        >
          ↻ Analyze again
        </button>
      )}
    </div>
  );
}

