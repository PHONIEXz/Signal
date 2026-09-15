"use client";

import { useEffect, useState } from "react";
import SignalThinkingState from "@/components/dashboard/SignalThinkingState";
import { waitForSignalAnalysis } from "@/lib/minimum-duration";

type AnalysisResponse = {
  insight: string;
  meta?: {
    mode?: string;
    dataConfidence?: {
      score?: number;
      label?: string;
    };
  };
};

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

  return data as AnalysisResponse;
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
  const [confidence, setConfidence] = useState<{
    score?: number;
    label?: string;
  } | null>(null);

  async function generateAnalysis() {
    setLoading(true);
    setError("");

    try {
      const [result] = await Promise.all([
        requestAnalysis(platform, sampleSize),
        waitForSignalAnalysis(),
      ]);
      setInsight(result.insight);
      setConfidence(result.meta?.dataConfidence ?? null);
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

    Promise.all([
      requestAnalysis(platform, sampleSize),
      waitForSignalAnalysis(),
    ])
      .then(([result]) => {
        if (!cancelled) {
          setInsight(result.insight);
          setConfidence(result.meta?.dataConfidence ?? null);
        }
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

        <div className="flex items-center gap-2">
          {confidence?.label && !loading && (
            <span className="rounded-md border border-border px-2 py-1 text-xs capitalize text-ink-muted">
              {confidence.label} evidence
              {typeof confidence.score === "number" ? ` ${confidence.score}%` : ""}
            </span>
          )}
          <span className="rounded-md border border-navy/15 bg-navy/5 px-2 py-1 text-xs font-medium text-navy">
            Balanced
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
