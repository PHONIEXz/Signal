"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { calculateEngagementRate, type Plan } from "@/lib/metrics";
import PostSampleSelector from "@/components/dashboard/PostSampleSelector";

type Snapshot = {
  followersCount: number;
  followingCount: number | null;
  postCount: number | null;
  totalLikes: number | null;
  totalViews: number | null;
  totalEngagements: number | null;
  postsAnalyzed: number;
  sampleSize: number;
  postMetricsStatus: string;
  fetchedAt: string;
};

export default function MetricsPanel({
  platform,
  snapshot,
  plan,
  sampleSize,
}: {
  platform: string;
  snapshot: Snapshot | null;
  plan: Plan;
  sampleSize: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleRefresh() {
    setLoading(true);
    setError("");
    setNotice("");

    const res = await fetch(`/api/metrics/refresh/${platform}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postLimit: sampleSize }),
    });
    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to refresh.");
      return;
    }

    if (data.warning) setNotice(data.warning);

    router.refresh();
  }

  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);

  const engagementRate = snapshot
    ? calculateEngagementRate(snapshot.totalEngagements, snapshot.totalViews)
    : null;

  return (
    <div className="space-y-4">
      <PostSampleSelector plan={plan} selected={sampleSize} />
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-medium text-ink">
              {platformLabel} metrics
            </p>
            {snapshot && (
              <p className="mt-1 font-mono text-xs text-ink-muted">
                Last updated{" "}
                {new Date(snapshot.fetchedAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-auto px-4"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {notice && <p className="mt-4 text-sm text-amber-600">{notice}</p>}

        {snapshot ? (
          <>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <Stat label="Followers" value={snapshot.followersCount} />
              <Stat label="Following" value={snapshot.followingCount} />
              <Stat label="Account posts" value={snapshot.postCount} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4">
              <Stat label="Sample likes" value={snapshot.totalLikes} />
              <Stat label="Sample views" value={snapshot.totalViews} />
              <Stat
                label="Engagement by views"
                value={
                  engagementRate === null
                    ? null
                    : Math.round(engagementRate * 10) / 10
                }
                suffix="%"
              />
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              Based on {snapshot.postsAnalyzed} available post
              {snapshot.postsAnalyzed === 1 ? "" : "s"}
              {snapshot.sampleSize
                ? ` from the requested last ${snapshot.sampleSize}`
                : ""}
              .
            </p>
            {snapshot.postMetricsStatus !== "AVAILABLE" && (
              <p className="mt-2 text-xs text-amber-600">
                {snapshot.postMetricsStatus === "UNAVAILABLE"
                  ? "Recent post metrics were unavailable during this refresh."
                  : "Some metrics are not available from this platform connection."}
              </p>
            )}
          </>
        ) : (
          <p className="mt-6 text-sm text-ink-muted">
            No data for this post sample yet. Click Refresh to create the first
            snapshot.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div>
      <p className="font-display text-2xl font-medium text-ink">
        {value === null ? "Unavailable" : `${value.toLocaleString()}${suffix}`}
      </p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}
