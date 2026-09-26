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
        <div className="dashboard-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-16 lg:py-28">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e4a16e]">Signal / A creator workspace</p>
            <h1 className="mt-8 max-w-2xl font-display text-5xl font-medium leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-[4.4rem]">See the story behind your audience.</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/75 sm:text-lg">Signal brings your connected accounts, available performance data, reports and content drafts into one workspace. See what is working before you decide what to make next.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/product" className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-[#102f4d] hover:bg-white/90">Explore how Signal works <span aria-hidden="true">↗</span></Link>
              <Link href="/login" className="rounded-md border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">Log in to Signal</Link>
            </div>
            <p className="mt-5 text-xs leading-5 text-white/60">Data availability depends on each platform and the permissions you grant.</p>
          </div>
          <figure className="relative rounded-lg border border-white/20 bg-[#e8eef4] p-2 text-[#172b3d] shadow-[0_32px_64px_-40px_rgba(0,0,0,0.6)] sm:p-3">
            <div className="overflow-hidden rounded-[1.35rem] border border-[#d6e0e9] bg-white" aria-hidden="true">
              <div className="flex items-center justify-between border-b border-[#e5ebf1] px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#173f62] text-xs font-bold text-white">S</span>
                  <span className="font-display text-sm font-bold tracking-[-0.03em]">Signal <span className="font-normal text-[#8a99a8]">/ Overview</span></span>
                </div>
                <span className="rounded-full border border-[#d8e4ed] bg-[#f5f8fb] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#4c687d]">Sample view</span>
              </div>
              <div className="grid sm:grid-cols-[7rem_minmax(0,1fr)]">
                <div className="hidden flex-col gap-2 border-r border-[#e5ebf1] bg-[#f7f9fc] px-3 py-5 sm:flex">
                  <span className="rounded-lg bg-[#e6f0f7] px-2.5 py-2 text-[10px] font-bold text-[#173f62]">Overview</span>
                  <span className="px-2.5 py-2 text-[10px] font-medium text-[#778898]">Accounts</span>
                  <span className="px-2.5 py-2 text-[10px] font-medium text-[#778898]">Posts</span>
                  <span className="px-2.5 py-2 text-[10px] font-medium text-[#778898]">Insights</span>
                  <span className="mt-auto rounded-lg border border-[#e4eaf0] bg-white px-2.5 py-3 text-[10px] font-semibold text-[#496477]">One clearer view ↗</span>
                </div>
                <div className="min-w-0 bg-[#fbfcfe] p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#668199]">Creator workspace</p>
                      <h2 className="mt-1 font-display text-lg font-bold tracking-[-0.035em] text-[#173650]">Your audience, in focus.</h2>
                    </div>
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#eb8a47] shadow-[0_0_0_4px_rgba(235,138,71,0.14)]" />
                  </div>
                  <div className="mt-5 rounded-xl border border-[#e1e8ef] bg-white p-4 shadow-[0_12px_28px_-22px_rgba(16,47,77,0.5)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#798b9a]">Account overview</p>
                        <p className="mt-1 text-sm font-semibold text-[#173650]">Notice the direction</p>
                      </div>
                      <span className="text-[10px] font-semibold text-[#2f9e6f]">Example trend ↗</span>
                    </div>
                    <svg viewBox="0 0 420 150" className="mt-3 h-auto w-full" fill="none" preserveAspectRatio="xMidYMid meet">
                      <defs>
                        <linearGradient id="signal-preview-area" x1="0" y1="0" x2="0" y2="1">
                          <stop stopColor="#66bba7" stopOpacity="0.26" />
                          <stop offset="1" stopColor="#66bba7" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0 37H420M0 78H420M0 119H420" stroke="#e7edf2" strokeDasharray="4 5" />
                      <path d="M0 116C34 105 49 112 77 100S126 108 157 89 206 96 237 70 283 82 314 55 363 67 420 26V150H0Z" fill="url(#signal-preview-area)" />
                      <path d="M0 116C34 105 49 112 77 100S126 108 157 89 206 96 237 70 283 82 314 55 363 67 420 26" stroke="#2f9e82" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="420" cy="26" r="5" fill="#eb8a47" stroke="white" strokeWidth="3" />
                    </svg>
                    <div className="flex justify-between text-[9px] font-medium uppercase tracking-wider text-[#94a2af]"><span>Earlier</span><span>Later</span></div>
                  </div>
                  <div className="mt-3 grid gap-3 min-[410px]:grid-cols-2">
                    <div className="rounded-xl border border-[#e1e8ef] bg-white p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#798b9a]">Your channels</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e7edf4] text-[10px] font-bold">X</span>
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e7edf4] text-[10px] font-bold">f</span>
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e7edf4] text-[10px] font-bold">♪</span>
                        <span className="ml-auto text-[10px] font-semibold text-[#496477]">In context</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#f2dfcf] bg-[#fff9f4] p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#aa6c42]">Next move</p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-[#633e2b]">Turn a useful signal into a content idea.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <figcaption className="px-2 pb-1 pt-3 text-center text-[11px] text-[#496477]">Illustrative workspace preview. No live account data is shown.</figcaption>
          </figure>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy">The workflow</p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">From account data to a clearer decision</h2>
        <div className="mt-9 grid border-t border-border md:grid-cols-3">
          {steps.map(([title, detail], index) => (
            <article key={title} className="border-b border-border py-7 md:border-r md:px-7 md:last:border-r-0 md:first:pl-0">
              <span className="section-index">0{index + 1} / SIGNAL</span>
              <h3 className="mt-7 font-display text-2xl font-medium text-ink">{title}</h3>
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
              <div key={name} className="border-l-2 border-amber bg-paper p-5">
                <p className="font-display text-xl font-medium text-ink">{name}</p>
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
        <div className="border-t-2 border-navy bg-surface p-7 shadow-soft sm:p-9">
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
