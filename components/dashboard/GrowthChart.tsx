"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { growthRange } from "@/lib/growth-chart";

type Point = {
  date: string;
  followers: number;
  likes: number | null;
  views: number | null;
  posts: number | null;
};

const metrics = {
  followers: {
    label: "Followers",
    key: "followers",
  },
  views: {
    label: "Views",
    key: "views",
  },
  likes: {
    label: "Likes",
    key: "likes",
  },
  posts: {
    label: "Posts",
    key: "posts",
  },
} as const;

type MetricKey = keyof typeof metrics;

export default function GrowthChart({ data, platform }: { data: Point[]; platform?: string }) {
  const [activeMetric, setActiveMetric] =
    useState<MetricKey>("followers");

  const [zeroBaseline, setZeroBaseline] = useState(false);
  const chartData = useMemo(() => data.map(point => ({ ...point, timestamp: Date.parse(point.date) }))
    .filter(point => Number.isFinite(point.timestamp)).sort((a, b) => a.timestamp - b.timestamp), [data]);
  const observed = chartData.map(point => point[activeMetric]).filter((value): value is number => value !== null && Number.isFinite(value));
  const domain = growthRange(observed, zeroBaseline);
  const flat = observed.length >= 2 && observed.every(value => value === observed[0]);
  const current = chartData[chartData.length - 1];
  const previous = chartData[chartData.length - 2];

  const values = useMemo(() => {
    if (!current || !previous || activeMetric === "likes" || activeMetric === "views") {
      return {
        change: null,
        percentage: null,
      };
    }

    const currentValue = current[metrics[activeMetric].key];
    const previousValue = previous[metrics[activeMetric].key];

    if (currentValue === null || previousValue === null) {
      return { change: null, percentage: null };
    }

    const change = currentValue - previousValue;

    const percentage =
      previousValue > 0 ? (change / previousValue) * 100 : null;

    return {
      change,
      percentage,
    };
  }, [activeMetric, current, previous]);

  const positive = values.change !== null && values.change > 0;
  const negative = values.change !== null && values.change < 0;
  const currentValue = current?.[metrics[activeMetric].key] ?? null;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-lg font-medium text-ink">
              Growth Intelligence
            </p>

            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="text-3xl font-medium text-ink">
                {currentValue === null ? "Unavailable" : currentValue.toLocaleString()}
              </span>

              <span className="text-sm text-ink-muted">
                {activeMetric === "likes" ? platform === "facebook" ? "Sample reactions" : "Sample likes" : activeMetric === "views" ? "Sample views" : metrics[activeMetric].label}
              </span>
            </div>
          </div>

          <div className="rounded-md border border-border px-3 py-2 text-right">
            <p className="text-xs text-ink-muted">
              Momentum
            </p>

            <p
              className={`mt-1 text-sm font-medium ${
                positive
                  ? "text-connected"
                  : negative
                    ? "text-red-600"
                    : "text-ink"
              }`}
            >
              {values.change === null
                ? "Unavailable"
                : positive
                ? "Growing"
                : negative
                  ? "Declining"
                  : "Stable"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(metrics) as MetricKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveMetric(key)}
              aria-pressed={activeMetric === key}
              className={`min-h-11 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                activeMetric === key
                  ? "bg-action text-white"
                  : "border border-border text-ink-muted hover:text-ink"
              }`}
            >
              {key === "likes" ? platform === "facebook" ? "Sample reactions" : "Sample likes" : key === "views" ? "Sample views" : metrics[key].label}
            </button>
          ))}
        </div>

        <div>
          <p className="text-sm text-ink-muted">
            Change since last refresh:
          </p>

          <p className="mt-1 text-lg font-medium text-ink">
            {values.change === null ? (
              "Unavailable for this sample"
            ) : (
              <>
                {values.change >= 0 ? "+" : ""}
                {values.change.toLocaleString()}
                <span className="ml-2 text-sm text-ink-muted">
                  {values.percentage === null
                    ? "(no percentage baseline)"
                    : `(${values.percentage.toFixed(1)}%)`}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {(activeMetric === "likes" || activeMetric === "views") && <p className="mt-4 text-xs text-ink-muted">These totals come from recent post samples that can change between refreshes. They do not measure new interactions or same-post growth. Open a post’s measurement history for a comparable change.</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">{chartData.length} saved refreshes · Times in UTC</p>
        <button type="button" aria-pressed={zeroBaseline} onClick={() => setZeroBaseline(value => !value)}
          className="min-h-11 rounded-full border border-border px-4 text-sm font-medium text-ink">
          {zeroBaseline ? "Scale: from zero" : "Scale: focused range"}
        </button>
      </div>
      <p className="mt-2 text-sm text-ink-muted" role="status">
        {observed.length === 0 ? "No recorded values for this metric yet. Refresh the account to collect a snapshot."
          : observed.length === 1 ? "One recorded value so far. Another successful refresh is needed to show change."
          : flat ? "The recorded values are unchanged, so this line is flat. Refresh after your account metrics change to see movement."
          : "Each dot is a saved measurement. Gaps mean a value was unavailable."}
        {observed.length > 0 && !zeroBaseline && " The vertical axis is zoomed to the recorded values; it may not start at zero."}
      </p>
      {observed.length > 0 && <div className="mt-4 h-64" aria-label={`${metrics[activeMetric].label} history chart. Exact values are available below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 18, bottom: 8, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={value => new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
              minTickGap={48}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              domain={domain}
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={64}
            />

            <Tooltip
              labelFormatter={value => new Date(Number(value)).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC"}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-ink)",
              }}
            />

            <Line
              isAnimationActive={false}
              type="linear"
              connectNulls={false}
              name={metrics[activeMetric].label}
              dataKey={metrics[activeMetric].key}
              stroke="var(--color-action)"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>}
      {chartData.length > 0 && <details className="mt-4 border-t border-border pt-4">
        <summary className="cursor-pointer py-2 text-sm font-medium text-ink">View recorded values</summary>
        <div className="mt-3 max-h-64 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Saved {metrics[activeMetric].label.toLowerCase()} measurements, UTC</caption>
            <thead><tr className="text-ink-muted"><th scope="col" className="py-2">Refresh (UTC)</th><th scope="col" className="py-2 text-right">{metrics[activeMetric].label}</th></tr></thead>
            <tbody>{chartData.map((point, index) => <tr key={`${point.timestamp}-${index}`} className="border-t border-border">
              <td className="py-2 text-ink-muted">{new Date(point.timestamp).toLocaleString("en-US", { timeZone: "UTC" })}</td>
              <td className="py-2 text-right font-medium text-ink">{point[activeMetric]?.toLocaleString() ?? "Unavailable"}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </details>}
    </div>
  );
}
