"use client";

import { useEffect, useState } from "react";

async function requestAnalysis(platform: string, sampleSize: number) {
  const response = await fetch("/api/insights/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      platform,
      postLimit: sampleSize,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to generate analysis");
  }

  return data.insight as string;
}

export default function AccountAIAnalysis({
  platform = "x",
  sampleSize = 10,
}: {
  platform?: string;
  sampleSize?: number;
}) {
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function generateAnalysis() {
    setLoading(true);
    setError("");

    try {
      setInsight(await requestAnalysis(platform, sampleSize));
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

    requestAnalysis(platform, sampleSize)
      .then((nextInsight) => {
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
  }, [platform, sampleSize]);

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display text-lg font-medium text-ink">
            Signal AI Analysis
          </p>

          <p className="mt-1 text-sm text-ink-muted">
            Independent intelligence for your {platform} account.
          </p>
        </div>

        <span className="rounded-md border border-border px-2 py-1 text-xs text-ink-muted">
          AI
        </span>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            <div className="h-3 w-full animate-pulse rounded bg-paper" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-paper" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-paper" />
          </div>
        ) : error ? (
          <div>
            <p className="text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={generateAnalysis}
              className="mt-3 text-xs font-medium text-ink underline underline-offset-4"
            >
              Retry analysis
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
          onClick={generateAnalysis}
          className="mt-5 text-xs font-medium text-ink-muted hover:text-ink"
        >
          Refresh analysis
        </button>
      )}
    </div>
  );
}
