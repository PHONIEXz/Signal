"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Point = { date: string; followers: number };

export default function GrowthChart({ data }: { data: Point[] }) {
  if (data.length < 2) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="font-display text-lg font-medium text-ink">
          Follower growth
        </p>
        <p className="mt-4 text-sm text-ink-muted">
          Check back after a few more refreshes to see your growth trend here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <p className="font-display text-lg font-medium text-ink">
        Follower growth
      </p>
      <div className="mt-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--color-ink-muted)" }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-ink-muted)" }}
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
              dataKey="followers"
              stroke="var(--color-navy)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

