"use client";

import { useEffect, useState } from "react";

type PlatformNote = {
  platform: string;
  headline: string;
  detail: string;
};

type Report = {
  summary: string;
  wins: string[];
  opportunities: string[];
  actions: string[];
  platformNotes: PlatformNote[];
};

function cleanText(value: string) {
  return value.replace(/[—–]/g, "-");
}

export default function SignalReport() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function generateReport() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not generate the report.");
      }

      setReport(data.report);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate the report."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generateReport();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy/10 text-navy">
            ✦
          </div>
          <div>
            <p className="font-display text-lg font-medium text-ink">
              Signal AI is analyzing your accounts
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Comparing your latest metrics, history and recent content.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="h-3 animate-pulse rounded bg-paper" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-paper" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-paper" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-surface p-6">
        <p className="font-display text-lg font-medium text-ink">
          Signal AI could not generate this report
        </p>
        <p className="mt-2 text-sm text-red-600">{cleanText(error)}</p>
        <button
          type="button"
          onClick={generateReport}
          className="mt-4 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border bg-paper px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy/10 text-navy">
                ✦
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy">
                  Signal AI
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Auto-generated from your available account data
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={generateReport}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface"
            >
              Regenerate
            </button>
          </div>
        </div>

        <div className="px-6 py-7">
          <p className="max-w-3xl text-base leading-7 text-ink">
            {cleanText(report.summary)}
          </p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        <InsightGroup
          title="What is working"
          items={report.wins}
        />
        <InsightGroup
          title="Opportunities"
          items={report.opportunities}
        />
        <InsightGroup
          title="Next actions"
          items={report.actions}
        />
      </div>

      {report.platformNotes?.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-6">
          <div>
            <p className="font-display text-lg font-medium text-ink">
              Platform intelligence
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              A focused read of each connected platform.
            </p>
          </div>

          <div className="mt-5 divide-y divide-border">
            {report.platformNotes.map((note) => (
              <div
                key={note.platform}
                className="py-5 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-connected" />
                  <p className="text-sm font-medium text-ink">
                    {cleanText(note.platform)}
                  </p>
                </div>
                <p className="mt-2 text-sm font-medium text-ink">
                  {cleanText(note.headline)}
                </p>
                <p className="mt-1 text-sm leading-6 text-ink-muted">
                  {cleanText(note.detail)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InsightGroup({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <p className="font-display text-lg font-medium text-ink">{title}</p>

      <div className="mt-5 space-y-4">
        {items?.map((item, index) => (
          <div key={`${title}-${index}`} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper text-[11px] font-medium text-ink-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="text-sm leading-6 text-ink-muted">
              {cleanText(item)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
