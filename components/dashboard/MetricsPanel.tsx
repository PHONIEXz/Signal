"use client";

import { useRefreshGate } from "./useRefreshGate";
import type { RefreshGate } from "@/lib/refresh-gate";
import { LocalTime } from "@/components/dashboard/TimePreferences";
import { metricRefreshError } from "@/lib/metric-diagnostics";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { calculateEngagementRate, type Plan, type PostMetricSummary } from "@/lib/metrics";
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
  refreshGate,
  snapshot,
  plan,
  sampleSize,
  pageMediaViews,
  postMetrics,
  postMeasuredAt,
}: {
  platform: string;
  refreshGate?: RefreshGate;
  snapshot: Snapshot | null;
  plan: Plan;
  sampleSize: number;
  pageMediaViews?: number | null;
  postMetrics?: PostMetricSummary;
  postMeasuredAt?: string | null;
}) {
  const router = useRouter();
  const refreshBlocked = useRefreshGate(refreshGate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleRefresh() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
    const res = await fetch(`/api/metrics/refresh/${platform}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postLimit: sampleSize }),
    });
    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(metricRefreshError(data));
      router.refresh();
      return;
    }

    setNotice([data.message || "Your metrics have been updated.",data.warning].filter(Boolean).join(" "));

    router.refresh();
    } catch { setError("Could not reach SocialPanora. Check your connection and try again."); }
    finally { setLoading(false); }
  }

  const platformLabel = platform.charAt(0).toUpperCase() + platform.slice(1);

  const postLikes=postMetrics ? postMetrics.likes : snapshot?.totalLikes ?? null;
  const postViews=postMetrics ? postMetrics.views : snapshot?.totalViews ?? null;
  const postEngagements=postMetrics ? postMetrics.engagements : snapshot?.totalEngagements ?? null;
  const analyzed=postMetrics ? postMetrics.postsAnalyzed : snapshot?.postsAnalyzed ?? 0;
  const engagementRate=calculateEngagementRate(postEngagements,postViews);

  return (
    <div className="space-y-4">
      <PostSampleSelector plan={plan} selected={sampleSize} />
      <div data-reveal className="workspace-panel rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-lg font-medium text-ink">
              {platformLabel} metrics
            </p>
            {snapshot && (
              <p className="mt-1 font-mono text-xs text-ink-muted">
                Account counters measured{" "}
                <LocalTime value={snapshot.fetchedAt} />
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            fullWidth={false}
            className="shrink-0 px-4"
            onClick={handleRefresh}
            disabled={loading || refreshBlocked}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {refreshGate?.reason && <p role="status" className="mt-4 text-sm text-ink-muted">{refreshGate.reason} {refreshGate.availableAt && <>Next refresh: <LocalTime value={refreshGate.availableAt} />.</>}</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {notice && <p className="mt-4 text-sm text-amber-600">{notice}</p>}

        {!postMetrics && snapshot && snapshot.sampleSize !== sampleSize && (
          <p className="mt-4 text-sm text-ink-muted" role="status">
            Showing saved results for the last {snapshot.sampleSize} posts.
            Refresh to collect your selected {sampleSize}-post sample.
          </p>
        )}

        {snapshot || analyzed>0 ? (
          <>
            {platform === "facebook" ? (
              <>
                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                  <Stat label="Page followers" value={snapshot?.followersCount ?? null} />
                  <Stat label="Posts analyzed" value={analyzed} />
                  {postLikes !== null && (
                    <Stat label="Sample reactions" value={postLikes} />
                  )}
                  {postEngagements !== null && (
                    <Stat label="Sample engagements" value={postEngagements} />
                  )}
                  {pageMediaViews !== null && pageMediaViews !== undefined && (
                    <Stat label="Daily Page media views" value={pageMediaViews} />
                  )}
                </div>
                <p className="mt-3 text-xs text-ink-muted">
                  Account counters and post measurements may have different collection times.
                </p>
              </>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                  <Stat label="Followers" value={snapshot?.followersCount ?? null} />
                  {snapshot?.followingCount != null && (
                    <Stat label="Following" value={snapshot?.followingCount} />
                  )}
                  {snapshot?.postCount != null && (
                    <Stat label="Account posts" value={snapshot?.postCount} />
                  )}
                  {postLikes !== null && (
                    <Stat label="Sample likes" value={postLikes} />
                  )}
                  {postViews !== null && (
                    <Stat label="Sample views" value={postViews} />
                  )}
                  {engagementRate !== null && (
                    <Stat
                      label="Engagement by views"
                      value={Math.round(engagementRate * 10) / 10}
                      suffix="%"
                    />
                  )}
                </div>
              </>
            )}
            {postMeasuredAt && <p className="mt-3 text-xs text-ink-muted">Newest selected post measurement: <LocalTime value={postMeasuredAt} />. Posts may contain measurements from different refreshes or CSV imports.</p>}
            <p className="mt-3 text-xs text-ink-muted">
              Based on {analyzed} available post
              {analyzed === 1 ? "" : "s"}
              {sampleSize
                ? ` from the selected last ${sampleSize} stored posts`
                : ""}
              . Counts are cumulative at measurement time; the selected posts may change between refreshes.
            </p>
            {(postLikes===null || postEngagements===null || (platform!=="facebook" && postViews===null)) && (
              <p className="mt-2 text-xs text-ink-muted">
                Some insights are currently unavailable from this account.
              </p>
            )}
          </>
        ) : (
          <p className="mt-6 text-sm text-ink-muted">
            Your account is connected. Refresh to collect your first insights.
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
    <div className="metric-tile">
      <p className="font-display text-2xl font-bold text-ink">
        {value === null ? "Unavailable" : `${value.toLocaleString("en-US")}${suffix}`}
      </p>
      <p className="mt-2 text-sm font-medium text-ink-muted">{label}</p>
    </div>
  );
}
