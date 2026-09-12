"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandMark from "@/components/BrandMark";

type IconName = "overview" | "posts" | "studio" | "accounts" | "reports" | "settings";

const NAV_ITEMS: { label: string; shortLabel: string; href: string; icon: IconName }[] = [
  { label: "Overview", shortLabel: "Home", href: "/dashboard", icon: "overview" },
  { label: "Posts", shortLabel: "Posts", href: "/dashboard/posts", icon: "posts" },
  { label: "Content Studio", shortLabel: "Create", href: "/dashboard/content", icon: "studio" },
  { label: "Accounts", shortLabel: "Accounts", href: "/dashboard/accounts", icon: "accounts" },
  { label: "Reports", shortLabel: "Reports", href: "/dashboard/reports", icon: "reports" },
  { label: "Settings", shortLabel: "Settings", href: "/dashboard/settings", icon: "settings" },
];

function isItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border/80 bg-surface/[0.92] px-4 py-6 backdrop-blur-xl sm:flex">
        <BrandMark className="px-2" />

        <nav className="mt-10 flex flex-col gap-1.5" aria-label="Dashboard navigation">
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-action text-white shadow-md shadow-navy/15"
                    : "text-ink-muted hover:bg-paper hover:text-ink"
                }`}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl border border-border bg-paper/70 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">Your workspace</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-ink-muted">
            Your connected signals stay together here.
          </p>
        </div>
      </aside>

      <nav
        className="fixed inset-x-2 bottom-2 z-50 grid grid-cols-6 rounded-2xl border border-border/80 bg-surface/[0.94] p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-2xl shadow-navy/15 backdrop-blur-xl sm:hidden"
        aria-label="Mobile dashboard navigation"
      >
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px] font-semibold transition-colors ${
                active ? "bg-action text-white" : "text-ink-muted"
              }`}
            >
              <NavIcon name={item.icon} />
              <span className="w-full truncate text-center">{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function NavIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    posts: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    studio: <><path d="M12 3l1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Z" /><path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14ZM18 13l.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z" /></>,
    accounts: <><circle cx="8" cy="9" r="3" /><circle cx="17" cy="8" r="2.5" /><path d="M3 20c.5-3.2 2.1-5 5-5s4.5 1.8 5 5M14 14c3.8-.7 6.3 1.3 7 4.5" /></>,
    reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
