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
  pageMediaViews,
}: {
  platform: string;
  snapshot: Snapshot | null;
  plan: Plan;
  sampleSize: number;
  pageMediaViews?: number | null;
}) {
  const router = useRouter();
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
      const message = String(data.error ?? "").toLowerCase();
      setError(
        message.includes("reconnect") || message.includes("token")
          ? `${platformLabel} needs to be reconnected before Signal can refresh it.`
          : message.includes("limit") || message.includes("allowed")
            ? "This account was refreshed recently. Please try again when the next refresh is available."
            : "We couldn't refresh this account right now. Your saved data is safe."
      );
      return;
    }

    setNotice(data.message || "Your metrics have been updated.");

    router.refresh();
    } catch { setError("Could not reach Signal. Check your connection and try again."); }
    finally { setLoading(false); }
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
            {platform === "facebook" ? (
              <>
                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                  <Stat label="Page followers" value={snapshot.followersCount} />
                  <Stat label="Posts analyzed" value={snapshot.postsAnalyzed} />
                  {snapshot.totalLikes !== null && (
                    <Stat label="Sample reactions" value={snapshot.totalLikes} />
                  )}
                  {snapshot.totalEngagements !== null && (
                    <Stat label="Sample engagements" value={snapshot.totalEngagements} />
                  )}
                  {pageMediaViews !== null && pageMediaViews !== undefined && (
                    <Stat label="Daily Page media views" value={pageMediaViews} />
                  )}
                </div>
                <p className="mt-3 text-xs text-ink-muted">
                  Showing the latest verified Page data available from Facebook.
                </p>
              </>
            ) : (
              <>
                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
                  <Stat label="Followers" value={snapshot.followersCount} />
                  {snapshot.followingCount !== null && (
                    <Stat label="Following" value={snapshot.followingCount} />
                  )}
                  {snapshot.postCount !== null && (
                    <Stat label="Account posts" value={snapshot.postCount} />
                  )}
                  {snapshot.totalLikes !== null && (
                    <Stat label="Sample likes" value={snapshot.totalLikes} />
                  )}
                  {snapshot.totalViews !== null && (
                    <Stat label="Sample views" value={snapshot.totalViews} />
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
            <p className="mt-3 text-xs text-ink-muted">
              Based on {snapshot.postsAnalyzed} available post
              {snapshot.postsAnalyzed === 1 ? "" : "s"}
              {snapshot.sampleSize
                ? ` from the requested last ${snapshot.sampleSize}`
                : ""}
              . Counts are cumulative at measurement time; the selected posts may change between refreshes.
            </p>
            {snapshot.postMetricsStatus !== "AVAILABLE" && (
              <p className="mt-2 text-xs text-ink-muted">
                Some insights are currently unavailable from this account.
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
  value: number;
  suffix?: string;
}) {
  return (
    <div>
      <p className="font-display text-2xl font-medium text-ink">
        {`${value.toLocaleString()}${suffix}`}
      </p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}
