"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

export default function GrowthChart({ data }: { data: Point[] }) {
  const [activeMetric, setActiveMetric] =
    useState<MetricKey>("followers");

  const current = data[data.length - 1];
  const previous = data[data.length - 2];

  const values = useMemo(() => {
    if (!current || !previous) {
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

  if (data.length < 2) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="font-display text-lg font-medium text-ink">
          Growth Intelligence
        </p>

        <p className="mt-4 text-sm text-ink-muted">
          Signal will build your growth timeline after more metric
          refreshes are collected.
        </p>
      </div>
    );
  }

  const positive = values.change !== null && values.change > 0;
  const negative = values.change !== null && values.change < 0;
  const currentValue = current[metrics[activeMetric].key];

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-lg font-medium text-ink">
              Growth Intelligence
            </p>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-medium text-ink">
                {currentValue === null ? "Unavailable" : currentValue.toLocaleString()}
              </span>

              <span className="text-sm text-ink-muted">
                {metrics[activeMetric].label}
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
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeMetric === key
                  ? "bg-navy text-white"
                  : "border border-border text-ink-muted hover:text-ink"
              }`}
            >
              {metrics[key].label}
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

      <div className="mt-6 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />

            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-ink)",
              }}
            />

            <Line
              type="monotone"
              dataKey={metrics[activeMetric].key}
              stroke="var(--color-navy)"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
