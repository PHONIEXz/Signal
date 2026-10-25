"use client";
import { useRefreshGate } from "./useRefreshGate";
import type { RefreshGate } from "@/lib/refresh-gate";
import { LocalTime } from "@/components/dashboard/TimePreferences";
import { metricRefreshError } from "@/lib/metric-diagnostics";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PostsRefresh({ platform, refreshGate }: { platform: string; refreshGate?: RefreshGate }) {
  const router = useRouter();
  const refreshBlocked = useRefreshGate(refreshGate);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function refresh() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/metrics/refresh/${platform}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postLimit: 10 }) });
      const data = await response.json();
      setNotice(response.ok ? [data.message || `Retrieved ${data.postsAnalyzed ?? 0} recent posts.`,data.warning].filter(Boolean).join(" ") : metricRefreshError(data));
      router.refresh();
    } catch { setNotice("Could not reach SocialPanora. Try again when your connection is available."); }
    finally { setBusy(false); }
  }
  return <div className="rounded-xl border border-border bg-surface p-4"><button type="button" disabled={busy || refreshBlocked} onClick={refresh} className="rounded-md bg-action px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Retrieving posts..." : "Retrieve recent posts"}</button><p className="mt-2 text-xs text-ink-muted">Requests the latest 10 posts. X requests may consume your app&apos;s API credits.</p>{refreshGate?.reason && <p role="status" className="mt-3 text-sm text-ink-muted">{refreshGate.reason} {refreshGate.availableAt && <>Next refresh: <LocalTime value={refreshGate.availableAt} />.</>}</p>}{notice && <p role="status" className="mt-3 text-sm text-ink">{notice}</p>}</div>;
}
