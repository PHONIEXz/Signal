"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PostsRefresh({ platform }: { platform: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function refresh() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/metrics/refresh/${platform}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postLimit: 10 }) });
      const data = await response.json();
      setNotice(response.ok ? data.warning || `Retrieved ${data.postsAnalyzed ?? 0} recent posts.` : data.error || "Post retrieval failed. Try again later.");
      if (response.ok) router.refresh();
    } catch { setNotice("Could not reach Signal. Try again when your connection is available."); }
    finally { setBusy(false); }
  }
  return <div className="rounded-xl border border-border bg-surface p-4"><button type="button" disabled={busy} onClick={refresh} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Retrieving posts..." : "Retrieve recent posts"}</button><p className="mt-2 text-xs text-ink-muted">Requests the latest 10 posts. X requests may consume your app&apos;s API credits.</p>{notice && <p role="status" className="mt-3 text-sm text-ink">{notice}</p>}</div>;
}
