import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteShell from "@/components/public/PublicSiteShell";
import WorkspacePreview from "@/components/public/WorkspacePreview";

export const metadata: Metadata = {
  title: "Signal | Find your next move",
  description:
    "A focused workspace for your social accounts, performance, insights and content drafts.",
};

const steps = [
  {
    title: "Bring it together.",
    label: "Connect",
    detail:
      "Connect X, Facebook or TikTok through the platform’s own authorization screen. Your channels finally share a workspace.",
    color: "bg-[#e3eacb]",
    symbol: "↗",
  },
  {
    title: "Find your signal.",
    label: "Understand",
    detail:
      "Explore available metrics, compare saved snapshots and ask better questions about your content. Know what the numbers actually mean.",
    color: "bg-[#dce5ff]",
    symbol: "≈",
  },
  {
    title: "Make your next move.",
    label: "Create",
    detail:
      "Turn an idea into a draft in Content Studio. Prepare your content, choose a channel and review the available delivery options.",
    color: "bg-[#f6d9c6]",
    symbol: "+",
  },
];

export default function HomePage() {
  return (
    <PublicSiteShell>
      <section className="mx-auto max-w-7xl px-5 pb-12 pt-12 sm:px-8 sm:pt-20">
        <div className="grid items-end gap-8 lg:grid-cols-[1.4fr_0.6fr]">
          <div>
            <p data-reveal="text" className="section-kicker flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-connected" />
              Less noise. More direction.
            </p>
            <h1 className="mt-6 max-w-4xl font-display text-[clamp(3.2rem,7.8vw,7rem)] font-bold leading-[0.98] tracking-[-0.065em] text-ink">
              Your audience.
              <br />
              Your next <span className="text-navy">move.</span>
            </h1>
          </div>
          <div data-reveal className="pb-2">
            <p className="max-w-md text-base leading-7 text-ink-muted">
              Bring your channels, content and performance into focus. A little
              less switching tabs. A lot more clarity.
            </p>
            <Link
              href="/signup"
              className="pill-link mt-6 bg-action text-white hover:bg-action-hover"
            >
              Find your signal <span aria-hidden="true">↗</span>
            </Link>
            <p className="mt-3 text-xs text-ink-muted">
              Start free with one connected account.
            </p>
          </div>
        </div>
        <WorkspacePreview />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
          <p className="text-sm text-ink-muted">
            One workspace. Different perspectives.
          </p>
          <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-ink sm:gap-10">
            <span>X</span>
            <span>Facebook</span>
            <span>TikTok</span>
          </div>
        </div>
      </section>

      <section
        id="workflow"
        className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-20"
      >
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p data-reveal="text" className="section-kicker">A clearer way to create</p>
            <h2 className="mt-4 max-w-xl font-display text-4xl font-bold leading-tight tracking-[-0.045em] text-ink sm:text-5xl">
              Good decisions start
              <br />
              with a better view.
            </h2>
          </div>
          <Link
            href="/product"
            className="pill-link border border-border text-ink hover:bg-surface"
          >
            Explore the workflow <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.label} className="surface-card p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl text-[#172524] ${step.color}`}
                  aria-hidden="true"
                >
                  {step.symbol}
                </span>
                <span className="font-mono text-xs text-ink-muted">
                  0{index + 1} / {step.label}
                </span>
              </div>
              <h3 className="mt-8 text-2xl font-bold tracking-tight text-ink">
                {step.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-ink-muted">
                {step.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <div data-reveal className="relative overflow-hidden rounded-[2rem] bg-[#173e36] px-6 py-12 text-white sm:p-12 lg:p-16">
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[60px] border-[#d9ed92]/10"
            aria-hidden="true"
          />
          <div className="relative grid gap-10 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#d9ed92]">
                Your workspace. Your control.
              </p>
              <h2 className="mt-5 text-4xl font-bold leading-tight tracking-[-0.045em] sm:text-5xl">
                Clarity includes
                <br />
                knowing the limits.
              </h2>
              <Link
                href="/product#tiktok"
                className="pill-link mt-8 bg-[#d9ed92] text-[#173e36] hover:bg-[#e7f4be]"
              >
                Explore platform access <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="space-y-6 lg:pt-2">
              {[
                [
                  "Real data, clearly labelled",
                  "Metrics depend on platform access and permissions. Missing data stays unavailable, and sample totals are labelled.",
                ],
                [
                  "Connections you control",
                  "Approve access with each platform and disconnect when you choose. TikTok publishing is completed on TikTok.",
                ],
                [
                  "AI on your terms",
                  "Optional insights help you explore your next step. You can turn them off in Settings.",
                ],
              ].map(([title, detail], i) => (
                <div
                  key={title}
                  data-reveal className="flex gap-4 border-b border-white/15 pb-6"
                >
                  <span className="pt-1 font-mono text-xs text-[#d9ed92]">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/75">
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <p data-reveal="text" className="section-kicker">Start with one channel</p>
        <h2 className="mt-4 text-4xl font-bold tracking-[-0.045em] text-ink sm:text-6xl">
          Make room for your next idea.
        </h2>
        <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-ink-muted">
          Connect an account. See what is available. Build from there. Multiple
          connected accounts require Pro.
        </p>
        <Link
          href="/signup"
          className="pill-link mt-8 bg-action text-white hover:bg-action-hover"
        >
          Create your workspace <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </PublicSiteShell>
  );
}
