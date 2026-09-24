import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteShell from "@/components/public/PublicSiteShell";

export const metadata: Metadata = {
  title: "Signal | Social analytics and content workspace",
  description: "Learn how Signal connects social accounts, shows available metrics, and helps creators plan content.",
};

const steps = [
  ["Connect", "Choose X, Facebook or TikTok in Accounts and approve access on the platform's own authorization screen."],
  ["Understand", "Review available account and post metrics, history, optional insights and reports in one dashboard."],
  ["Create", "Save drafts in Content Studio and prepare content for your connected channels."],
];

export default function HomePage() {
  return (
    <PublicSiteShell>
      <section className="relative overflow-hidden border-b border-border bg-[#102f4d] text-white">
        <div className="dashboard-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full bg-[#4f9ac8]/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16 lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.07] px-3 py-1.5 text-xs font-semibold text-white/80"><span className="h-2 w-2 rounded-full bg-amber" />Social account intelligence for creators</p>
            <h1 className="mt-7 max-w-2xl font-display text-5xl font-semibold leading-[1.07] tracking-[-0.05em] sm:text-6xl">See the story behind your audience.</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/75 sm:text-lg">Signal brings your connected accounts, available performance data, reports and content drafts into one workspace. See what is working before you decide what to make next.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/product" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#102f4d] hover:bg-white/90">Explore how Signal works</Link>
              <Link href="/login" className="rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">Log in to Signal</Link>
            </div>
            <p className="mt-5 text-xs leading-5 text-white/60">Data availability depends on each platform and the permissions you grant.</p>
          </div>
          <div className="rounded-[1.6rem] border border-white/20 bg-[#f4f7fb] p-3 text-[#111827] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.6)] sm:p-4">
            <div className="rounded-xl bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-[#e3e8ef] pb-5">
                <span className="font-display text-lg font-semibold">Signal overview</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#667085]">Illustrative layout</span>
              </div>
              <div className="grid gap-3 pt-5 sm:grid-cols-2">
                {[
                  ["Account overview", "Connected channels"],
                  ["Post analysis", "Recent performance"],
                  ["Insights and reports", "Questions and next steps"],
                  ["Content Studio", "Drafts and delivery"],
                ].map(([title, detail]) => (
                  <div key={title} className="rounded-xl border border-[#dfe5ec] bg-[#f8fafc] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#667085]">{title}</p>
                    <p className="mt-5 text-sm font-semibold">{detail}</p>
                    <div className="mt-5 h-2 w-3/4 rounded-full bg-[#dce6ee]" aria-hidden="true" />
                    <div className="mt-2 h-2 w-1/2 rounded-full bg-[#dce6ee]" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
            <p className="px-2 pb-1 pt-3 text-center text-[11px] text-[#667085]">Illustration of product sections. No live account data is shown.</p>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy">The workflow</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">From account data to a clearer decision</h2>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {steps.map(([title, detail], index) => (
            <article key={title} className="surface-card p-6 sm:p-7">
              <span className="font-mono text-xs font-semibold text-navy">0{index + 1} / SIGNAL</span>
              <h3 className="mt-7 font-display text-xl font-semibold text-ink">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-ink-muted">{detail}</p>
            </article>
          ))}
        </div>
        <Link href="/product" className="mt-8 inline-flex text-sm font-semibold text-navy underline underline-offset-4">Read the detailed product guide</Link>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-9 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy">Supported connections</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">Your channels, in context.</h2>
            <p className="mt-4 text-sm leading-7 text-ink-muted">Signal offers connections for X, Facebook and TikTok. Specific metrics depend on platform access, permissions and successful collection.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[["X", "Account and post metrics"], ["Facebook", "Page and post metrics"], ["TikTok", "Profile and video metrics"]].map(([name, detail]) => (
              <div key={name} className="rounded-2xl border border-border bg-paper p-5">
                <p className="font-display text-lg font-semibold text-ink">{name}</p>
                <p className="mt-2 text-xs leading-5 text-ink-muted">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy">Access and control</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-ink">Know what Signal can access.</h2>
          <p className="mt-4 text-sm leading-7 text-ink-muted">A platform asks you to approve access before Signal connects. You can disconnect an account and turn optional AI insights off in Settings. For TikTok, Signal reads authorized profile and video information. TikTok publishing is completed on TikTok.</p>
          <Link href="/product#tiktok" className="mt-6 inline-flex text-sm font-semibold text-navy underline underline-offset-4">See the TikTok integration details</Link>
        </div>
        <div className="rounded-[1.5rem] border border-border bg-surface p-7 shadow-soft sm:p-9">
          <h3 className="font-display text-xl font-semibold text-ink">Start with one account</h3>
          <p className="mt-3 text-sm leading-7 text-ink-muted">Create a Signal account, connect a supported platform, and open the dashboard. The Free plan supports one connected social account. Multiple accounts require Pro.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-xl bg-action px-5 py-3 text-sm font-semibold text-white hover:bg-action-hover">Create an account</Link>
            <Link href="/login" className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-ink hover:bg-paper">Already have an account?</Link>
          </div>
        </div>
      </section>
    </PublicSiteShell>
  );
}
