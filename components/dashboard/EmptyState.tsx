import Link from "next/link";

export default function EmptyState() {
  return (
    <div className="surface-card relative overflow-hidden px-6 py-16 text-center sm:px-10 sm:py-20">
      <div className="pointer-events-none absolute -left-24 -top-24 h-56 w-56 rounded-full bg-navy/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-amber/10 blur-3xl" />

      <div className="signal-visual mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-navy text-white shadow-xl shadow-navy/20 animate-float-soft">
        <svg viewBox="0 0 44 44" className="h-11 w-11" fill="none" aria-hidden="true">
          <path d="M5 28c4.5 0 4.5-14 9-14s4.5 18 9 18 4.5-23 9-23 4.5 11 7 11" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="39" cy="20" r="3.2" fill="var(--color-amber)" />
        </svg>
      </div>

      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-navy">Ready when you are</p>
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">Build your first signal</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-muted">
        Connect a social account and Signal will turn its metrics into one clear, focused dashboard.
      </p>

      <Link href="/dashboard/accounts" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-navy/20 transition-all hover:-translate-y-0.5 hover:bg-navy-dark">
        Choose a platform
        <span aria-hidden="true">→</span>
      </Link>

      <div className="mx-auto mt-10 flex max-w-sm items-center justify-center gap-5 border-t border-border pt-6 text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-muted">
        <span>Fast setup</span>
        <span className="h-1 w-1 rounded-full bg-border" />
        <span>Private tokens</span>
        <span className="h-1 w-1 rounded-full bg-border" />
        <span>Clear metrics</span>
      </div>
    </div>
  );
}
