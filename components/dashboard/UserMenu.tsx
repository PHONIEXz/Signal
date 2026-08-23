"use client";

import { signOut } from "next-auth/react";

export default function UserMenu({ email }: { email?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      {email && <span className="text-sm text-ink-muted">{email}</span>}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-md border border-border px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-navy hover:text-ink"
      >
        Log out
      </button>
    </div>
  );
}

