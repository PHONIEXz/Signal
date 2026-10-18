"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Account = { id: string; platform: string; displayName: string | null };
export default function ReportAccountSelector({ accounts, selected }: { accounts: Account[]; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  if (!accounts.length) return null;
  return <div className="surface-card flex flex-wrap items-center justify-between gap-4 p-5">
    <div><label htmlFor="report-account" className="text-sm font-semibold text-ink">Report scope</label><p className="mt-1 text-xs text-ink-muted">Focus on one account or compare your connected platforms.</p></div>
    <select id="report-account" value={selected} disabled={pending} aria-busy={pending} className="min-h-11 max-w-full rounded-xl border border-border bg-paper px-3 text-sm text-ink" onChange={event => {
      const params = new URLSearchParams(searchParams.toString());
      if (event.target.value) params.set("account", event.target.value); else params.delete("account");
      startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
    }}>
      {selected && !accounts.some(account => account.id === selected) && <option value={selected} disabled>Unavailable account</option>}
      <option value="">All connected accounts</option>
      {accounts.map(account => <option key={account.id} value={account.id}>{account.displayName || account.platform} ({account.platform})</option>)}
    </select>
    {pending && <span role="status" className="text-xs text-ink-muted">Updating scope…</span>}
  </div>;
}
