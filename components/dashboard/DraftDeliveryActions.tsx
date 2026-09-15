"use client";
import { useState } from "react";
import { assistedPublishUrl, deliveryText, RETRYABLE_DELIVERIES } from "@/lib/content-publishing";
export type DeliveryReceipt = { id: string; connectedAccountId: string; status: string; permalinkUrl: string | null; errorMessage: string | null; publishedAt: string | null };
type Account = { id: string; platform: string; displayName: string | null; platformUserId?: string | null };
type Draft = { id: string; text: string; mediaUrl: string | null; targets: Array<{ connectedAccount: Account }>; publications: DeliveryReceipt[] };
const LABELS: Record<string, string> = { PUBLISHED: "Published", PUBLISHING: "Check platform", UNKNOWN: "Check platform", FAILED: "Not sent", PERMISSION_REQUIRED: "Reconnect needed", RATE_LIMITED: "Wait before retrying", BILLING_REQUIRED: "API credits needed" };
export default function DraftDeliveryActions({ draft, refresh, notify }: { draft: Draft; refresh: () => Promise<void>; notify: (message: string) => void }) {
  const [sending, setSending] = useState<string | null>(null);
  async function publish(account: Account) {
    if (sending || !window.confirm(`Publish this saved draft to ${account.displayName || account.platform} now? Links are attached as links, not uploaded media.`)) return;
    setSending(account.id);
    try {
      const response = await fetch(`/api/drafts/${draft.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: account.id, confirm: true }) });
      const data = await response.json();
      notify(response.ok ? "Post published. Your delivery receipt is saved below." : data.error || "Delivery could not be confirmed. Check the platform.");
    } catch { notify("Delivery could not be confirmed. Refresh and check the platform before reposting."); }
    finally { await refresh().catch(() => notify("Refresh the library to check the latest delivery status.")); setSending(null); }
  }
  async function copyAndOpen(account: Account) {
    window.open(assistedPublishUrl(account.platform, draft.text, draft.mediaUrl, account.platformUserId), "_blank", "noopener,noreferrer");
    try { await navigator.clipboard.writeText(deliveryText(draft.text, draft.mediaUrl)); notify("Content copied. Finish publishing on the platform. Opening it does not mark this draft as published."); }
    catch { notify("Copy the draft text manually, then finish posting in the platform window."); }
  }
  return <div className="mt-5 space-y-3 border-t border-border pt-4">
    {draft.targets.map(({ connectedAccount: account }) => {
      const receipt = draft.publications?.find((row) => row.connectedAccountId === account.id);
      const locked = receipt && ["PUBLISHING", "UNKNOWN"].includes(receipt.status);
      const direct = ["x", "facebook"].includes(account.platform);
      const retryable = !receipt || RETRYABLE_DELIVERIES.includes(receipt.status);
      return <div key={account.id} className="rounded-lg bg-paper p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-medium text-ink">{account.displayName || account.platform}</p><p className="mt-1 text-xs text-ink-muted">{receipt ? LABELS[receipt.status] || "Ready to send" : direct ? "Ready for confirmation" : "Finish in TikTok"}</p></div>
          <div className="flex flex-wrap gap-2">
            {receipt?.permalinkUrl && <a href={receipt.permalinkUrl} target="_blank" rel="noopener noreferrer" className="rounded-md border border-border px-3 py-2 text-xs text-navy">View post</a>}
            {direct && retryable && <button disabled={sending !== null} onClick={() => publish(account)} className="rounded-md bg-navy px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{sending === account.id ? "Sending..." : "Publish now"}</button>}
            {!locked && receipt?.status !== "PUBLISHED" && <button disabled={sending !== null} onClick={() => copyAndOpen(account)} className="rounded-md border border-border px-3 py-2 text-xs text-ink disabled:opacity-50">Copy and open {account.platform === "x" ? "X" : account.platform === "facebook" ? "Facebook" : "TikTok"}</button>}
            {locked && <a href={assistedPublishUrl(account.platform, "", null, account.platformUserId).split("?")[0].replace("/intent/post", "/home")} target="_blank" rel="noopener noreferrer" className="rounded-md border border-border px-3 py-2 text-xs text-ink">Check platform</a>}
          </div>
        </div>
        {receipt?.errorMessage && <p className="mt-2 text-xs leading-5 text-ink-muted">{receipt.errorMessage}</p>}
        {receipt?.publishedAt && <p className="mt-2 text-xs text-ink-muted">Sent {new Date(receipt.publishedAt).toLocaleString()}</p>}
      </div>;
    })}
  </div>;
}
