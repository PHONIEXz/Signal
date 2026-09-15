"use client";

import { useState } from "react";
import Link from "next/link";

type AccountCardProps = {
  id: string;
  platform: string;
  displayName: string | null;
  followers: number | null;
};

const PLATFORM_DETAILS: Record<string, { label: string; mark: string; style: string }> = {
  x: { label: "X", mark: "X", style: "bg-ink text-surface" },
  facebook: { label: "Facebook", mark: "f", style: "bg-[#1877F2] text-white" },
  tiktok: { label: "TikTok", mark: "♪", style: "bg-[#111111] text-white" },
};

export default function AccountCard({ id, platform, displayName, followers }: AccountCardProps) {
  const [unlinking, setUnlinking] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const fallbackLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
  const details = PLATFORM_DETAILS[platform] ?? {
    label: fallbackLabel,
    mark: fallbackLabel.charAt(0),
    style: "bg-navy text-white",
  };

  async function unlinkAccount() {
    const confirmed = window.confirm(
      `Are you sure you want to unlink your ${details.label} account?`
    );

    if (!confirmed) return;
    setUnlinking(true);

    try {
      const response = await fetch(`/api/connect/${platform}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to unlink account");
      window.location.reload();
    } catch (error) {
      console.error("Unlink error:", error);
      window.alert(error instanceof Error ? error.message : "Failed to unlink account");
      setUnlinking(false);
    }
  }

  return (
    <div className="surface-card group flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <Link href={`/dashboard/accounts/${platform}`} className="flex min-w-0 flex-1 items-center gap-4">
        <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-base font-bold shadow-sm ${details.style}`}>
          {details.mark}
          {!imageFailed && (
            // This same-origin route authenticates before redirecting to the provider image.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/accounts/${id}/profile-image`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setImageFailed(true)}
            />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-display text-sm font-semibold text-ink">
              {displayName || details.label}
            </span>
            <span className="h-2 w-2 rounded-full bg-connected animate-pulse-dot" aria-label="Connected" />
          </span>
          <span className="mt-1 block text-xs text-ink-muted">
            {displayName && <>{details.label} · </>}
            {followers !== null ? `${followers.toLocaleString()} followers` : "Connected, waiting for metrics"}
          </span>
        </span>

        <span className="mr-2 hidden text-lg text-navy transition-transform duration-200 group-hover:translate-x-1 sm:block" aria-hidden="true">
          →
        </span>
      </Link>

      <button
        type="button"
        onClick={unlinkAccount}
        disabled={unlinking}
        className="rounded-xl border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:border-red-500/45 hover:bg-red-500/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {unlinking ? "Unlinking..." : "Unlink"}
      </button>
    </div>
  );
}
