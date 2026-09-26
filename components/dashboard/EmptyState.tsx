import Link from "next/link";

export default function EmptyState() {
  return (
    <div className="grid overflow-hidden rounded-lg border border-border bg-surface md:grid-cols-[1.3fr_0.7fr]">
      <div className="px-6 py-10 sm:px-10 sm:py-14">
        <p className="eyebrow">Overview / First connection</p>
        <h1 className="mt-5 max-w-lg font-display text-4xl font-medium leading-[1.08] tracking-[-0.04em] text-ink sm:text-5xl">Start with one channel.</h1>
        <p className="mt-5 max-w-md text-sm leading-7 text-ink-muted">Connect a social account to see the metrics its platform makes available, then build a picture of your audience over time.</p>
        <Link href="/dashboard/accounts" className="mt-8 inline-flex items-center gap-2 rounded-md bg-action px-5 py-3 text-sm font-semibold text-white hover:bg-action-hover">Choose a platform <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="flex flex-col justify-center border-t border-border bg-paper px-6 py-9 sm:px-10 md:border-l md:border-t-0">
        <p className="eyebrow">The path ahead</p>
        {[["01", "Connect"], ["02", "Explore"], ["03", "Create"]].map(([number, label]) => (
          <div key={number} className="flex items-baseline gap-5 border-b border-border py-4 last:border-b-0">
            <span className="section-index">{number}</span><span className="font-display text-xl text-ink">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
