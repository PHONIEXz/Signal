"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { growthRange, groupGrowth, growthPeriods, periodDescriptions, type GrowthPoint, type GrowthPeriod } from "@/lib/growth-chart";
import { useReducedMotion } from "@/components/motion/useMotion";

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

export default function GrowthChart({ data, sampleData = data, platform, historyLimited, asOf }: { data: GrowthPoint[]; sampleData?: GrowthPoint[]; platform?: string; historyLimited?: boolean; asOf?: string }) {
  const [activeMetric, setActiveMetric] =
    useState<MetricKey>("followers");

  const [zeroBaseline, setZeroBaseline] = useState(false);
  const [period, setPeriod] = useState<GrowthPeriod>("daily");
  const reducedMotion = useReducedMotion();
  const chartRoot = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!chartRoot.current) return;
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setInView(true); observer.disconnect(); }
    }, { threshold: 0.2 });
    observer.observe(chartRoot.current);
    return () => observer.disconnect();
  }, []);
  const metricData = activeMetric === "likes" || activeMetric === "views" ? sampleData : data;
  const chartData = useMemo(() => groupGrowth(metricData, period, asOf), [metricData, period, asOf]);
  const observed = chartData.map(point => point[activeMetric]).filter((value): value is number => value !== null && Number.isFinite(value));
  const domain = growthRange(observed, zeroBaseline);
  const flat = observed.length >= 2 && observed.every(value => value === observed[0]);
  const current = chartData.findLast(point => point.captured);
  const previous = current ? chartData[chartData.indexOf(current) - 1] : undefined;

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
    <div ref={chartRoot} data-reveal className="rounded-3xl border border-border bg-surface p-5 sm:p-7">
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
            Change since previous displayed period:
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
      {current && <p className="mt-3 text-xs text-ink-muted">Latest measurement in this view: {new Date(current.date).toLocaleString("en-US", {timeZone:"UTC"})} UTC</p>}
      <p className="mt-4 text-sm leading-6 text-ink-muted">History grows from successful collections. Followers and post counts use all account snapshots; sample likes and views use your selected post sample. Only recorded measurements receive dots.</p>
      <div className="mt-6 flex flex-wrap gap-1 rounded-2xl border border-border bg-paper p-1.5" role="group" aria-label="Growth chart interval">
        {growthPeriods.map(value => <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}
          className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold capitalize transition-all ${period === value ? "bg-action text-white shadow-md" : "text-ink-muted hover:bg-surface hover:text-ink"}`}>{value}</button>)}
      </div>
      <p className="mt-3 text-xs leading-5 text-ink-muted">Up to {periodDescriptions[period]}, ending at the current UTC period. Each point is the last snapshot in its UTC period, not a sum. Unmeasured periods have no dots. Refreshing collects data; changing this view does not.</p>
      {historyLimited && <p className="mt-2 text-xs text-ink-muted">Showing the latest 5,000 saved refreshes. Older history is outside this view.</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">{chartData.filter(point => point.captured).length} recorded periods · Times in UTC</p>
        <button type="button" aria-pressed={zeroBaseline} onClick={() => setZeroBaseline(value => !value)}
          className="min-h-11 rounded-full border border-border px-4 text-sm font-medium text-ink">
          {zeroBaseline ? "Scale: from zero" : "Scale: focused range"}
        </button>
      </div>
      <p className="mt-2 text-sm text-ink-muted" role="status">
        {observed.length === 0 ? "No recorded values for this metric yet. Refresh the account to collect a snapshot."
          : observed.length === 1 ? "One recorded value so far. Another successful refresh is needed to show change."
          : flat ? "The recorded values are unchanged, so this line is flat. New measurements will show movement only when the counts change."
          : "Dots show recorded values. Solid lines connect consecutive measurements; dashed links span periods without measurements."}
        {observed.length > 0 && !zeroBaseline && " The vertical axis is zoomed to the recorded values; it may not start at zero."}
      </p>
      {observed.length > 1 && <p className="mt-2 text-xs text-ink-muted">Dashed links connect known endpoints only. Values between them are unknown.</p>}
      {observed.length > 0 && <div className="mt-4 h-64" aria-label={`${metrics[activeMetric].label} history chart. Exact values are available below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart key={`${activeMetric}-${period}-${inView}`} data={chartData} margin={{ top: 12, right: 18, bottom: 8, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="4 4" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={value => new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", ...(period === "hourly" ? { hour: "2-digit" as const, minute: "2-digit" as const } : {}), ...(period === "yearly" ? { year: "numeric" as const } : {}), timeZone: "UTC" })}
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

            <Line dataKey={metrics[activeMetric].key} type="linear" connectNulls
              stroke="var(--color-action)" strokeWidth={2} strokeDasharray="5 5"
              dot={false} activeDot={false} legendType="none" tooltipType="none" isAnimationActive={false} />
            <Line
              isAnimationActive={!reducedMotion && inView}
              animationDuration={1100}
              animationEasing="ease-in-out"
              type="linear"
              connectNulls={false}
              name={metrics[activeMetric].label}
              dataKey={metrics[activeMetric].key}
              stroke="var(--color-action)"
              strokeWidth={3}
              dot={{ r: 4, fill: "var(--color-action)", stroke: "var(--color-surface)", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>}
      {chartData.length > 0 && <details className="mt-4 border-t border-border pt-4">
        <summary className="cursor-pointer py-2 text-sm font-medium text-ink">View period measurements</summary>
        <div className="mt-3 max-h-64 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Saved {metrics[activeMetric].label.toLowerCase()} measurements, UTC</caption>
            <thead><tr className="text-ink-muted"><th scope="col" className="py-2">Period (UTC)</th><th scope="col" className="py-2 text-right">{metrics[activeMetric].label}</th></tr></thead>
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
