"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Posts", href: "/dashboard/posts" },
  { label: "Accounts", href: "/dashboard/accounts" },
  { label: "Reports", href: "/dashboard/reports" },
  { label: "Settings", href: "/dashboard/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 flex-col border-r border-border bg-surface px-4 py-6 sm:flex">
      <span className="mb-8 px-2 font-display text-lg font-medium text-ink">
        Signal
      </span>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "rounded-md bg-navy/10 px-3 py-2 text-sm font-medium text-navy"
                  : "rounded-md px-3 py-2 text-sm text-ink-muted hover:bg-paper hover:text-ink"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

