"use client";

import { useState } from "react";
import Link from "next/link";

type AccountCardProps = {
  id: string;
  platform: string;
  followers: number | null;
};

export default function AccountCard({
  id,
  platform,
  followers,
}: AccountCardProps) {
  const [unlinking, setUnlinking] = useState(false);

  async function unlinkAccount() {
    const confirmed = window.confirm(
      `Are you sure you want to unlink your ${platform.toUpperCase()} account?`
    );

    if (!confirmed) {
      return;
    }

    setUnlinking(true);

    try {
      const response = await fetch(`/api/connect/${platform}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to unlink account");
      }

      window.location.reload();
    } catch (error) {
      console.error("Unlink error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to unlink account"
      );

      setUnlinking(false);
    }
  }

  return (
    <div
      className="flex items-center justify-between rounded-lg border border-border bg-surface px-5 py-4"
    >
      <Link
        href={`/dashboard/accounts/${platform}`}
        className="flex min-w-0 flex-1 items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span
            className="h-2.5 w-2.5 rounded-full bg-connected"
            aria-hidden="true"
          />

          <span className="font-mono text-sm capitalize text-ink">
            {platform}
          </span>
        </div>

        <span className="text-sm text-ink-muted">
          {followers !== null
            ? `${followers.toLocaleString()} followers`
            : "No data yet"}
        </span>
      </Link>

      {platform === "x" && (
        <button
          type="button"
          onClick={unlinkAccount}
          disabled={unlinking}
          className="ml-4 rounded-md border border-red-500/30 px-3 py-1.5 text-xs text-red-500 transition-colors hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {unlinking ? "Unlinking..." : "Unlink"}
        </button>
      )}
    </div>
  );
}
