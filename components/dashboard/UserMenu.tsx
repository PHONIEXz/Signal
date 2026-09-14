"use client";

import { signOut } from "next-auth/react";

export default function UserMenu({ email }: { email?: string | null }) {
  const initial = email?.charAt(0).toUpperCase() ?? "S";

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="hidden items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 shadow-sm md:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy text-xs font-semibold text-white">
          {initial}
        </span>
        {email && <span className="max-w-44 truncate text-xs text-ink-muted">{email}</span>}
      </div>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink-muted shadow-sm transition-all hover:border-navy/30 hover:text-ink"
      >
        Log out
      </button>
    </div>
  );
}
