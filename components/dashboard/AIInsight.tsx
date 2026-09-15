"use client";

import { useEffect, useState } from "react";
import SignalThinkingState from "@/components/dashboard/SignalThinkingState";
import { waitForSignalAnalysis } from "@/lib/minimum-duration";

async function requestInsight(platform: string) {
  const response = await fetch("/api/insights/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ platform }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to generate insight");
  }

  return data.insight as string;
}

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
      const [nextInsight] = await Promise.all([
        requestInsight(platform),
        waitForSignalAnalysis(),
      ]);
      setInsight(nextInsight);
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
    let cancelled = false;

    Promise.all([requestInsight(platform), waitForSignalAnalysis()])
      .then(([nextInsight]) => {
        if (!cancelled) setInsight(nextInsight);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Something went wrong."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
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
          <SignalThinkingState />
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
