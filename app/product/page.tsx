import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteShell from "@/components/public/PublicSiteShell";

export const metadata: Metadata = {
  title: "How Signal works | Account analytics, reports and drafts",
  description: "A guide to Signal's connected accounts, metrics, reports, Content Studio and TikTok integration.",
};

const steps = [
  {
    title: "Create an account and connect a channel",
    body: "After signing in, open Accounts, choose X, Facebook or TikTok, and approve the permissions shown by that platform. Signal saves the connection to your account. The Free plan supports one connection; Pro supports multiple.",
  },
  {
    title: "Inspect your account and post data",
    body: "The dashboard shows available follower and post metrics. Account pages show recent posts and history when the platform supplies them. Collection can be limited by expired tokens, missing permissions or platform limits. Signal labels unavailable data instead of treating it as zero.",
  },
  {
    title: "Make sense of what you see",
    body: "Use Insights to ask questions about connected account data and Reports to review a selected post sample. These optional AI features use data available to Signal and can be turned off in Settings.",
  },
  {
    title: "Prepare content in Content Studio",
    body: "Write and save drafts, attach a link or image where supported, and prepare content for a connected account. TikTok drafts are copied to TikTok for the final upload; Signal does not post them automatically.",
  },
];

export default function ProductPage() {
  return (
    <PublicSiteShell>
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy">Signal product guide</p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-[-0.045em] text-ink sm:text-5xl">What you can do in Signal</h1>
          <p className="mt-5 text-base leading-8 text-ink-muted">Signal is a web app for creators to inspect their own connected social accounts and work on content from one dashboard. This guide explains the main flows and what each platform connection is used for.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/signup" className="rounded-xl bg-action px-5 py-3 text-sm font-semibold text-white hover:bg-action-hover">Create an account</Link>
            <Link href="/login" className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-paper">Log in to the dashboard</Link>
          </div>
        </div>

        <section aria-labelledby="steps-title" className="mt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy">In the app</p>
          <h2 id="steps-title" className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] text-ink">A complete workflow</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {steps.map((step, index) => (
              <article key={step.title} className="surface-card p-6 sm:p-7">
                <span className="font-mono text-xs font-semibold text-navy">STEP 0{index + 1}</span>
                <h3 className="mt-4 font-display text-xl font-semibold text-ink">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-ink-muted">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="tiktok" aria-labelledby="tiktok-title" className="mt-20 scroll-mt-8 rounded-[1.5rem] border border-border bg-surface p-6 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy">Platform details</p>
          <h2 id="tiktok-title" className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] text-ink">How the TikTok connection works</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-muted">A signed-in user chooses Connect TikTok in Accounts. TikTok shows its authorization screen, and the user decides whether to grant access. TikTok then returns the user to Signal. The connection requests these read permissions:</p>
          <div className="mt-7 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <caption className="sr-only">TikTok permissions requested by Signal and their uses</caption>
              <thead className="bg-paper text-ink"><tr><th scope="col" className="px-5 py-4 font-semibold">Permission</th><th scope="col" className="px-5 py-4 font-semibold">Use in Signal</th></tr></thead>
              <tbody className="divide-y divide-border text-ink-muted">
                <tr><th scope="row" className="px-5 py-4 font-mono text-xs font-medium text-ink">user.info.basic</th><td className="px-5 py-4 leading-6">Identify the connected account and show available profile details.</td></tr>
                <tr><th scope="row" className="px-5 py-4 font-mono text-xs font-medium text-ink">user.info.stats</th><td className="px-5 py-4 leading-6">Retrieve available follower, following and video counts.</td></tr>
                <tr><th scope="row" className="px-5 py-4 font-mono text-xs font-medium text-ink">video.list</th><td className="px-5 py-4 leading-6">Read the available video list for recent video performance and trends.</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-5 text-sm leading-7 text-ink-muted">Signal does not request TikTok posting access. TikTok drafts are copied and opened on TikTok for the user to finish uploading. Users can unlink TikTok from Accounts, stopping later collection. Metrics depend on TikTok&apos;s response and the permissions granted.</p>
        </section>

        <section aria-labelledby="control-title" className="mt-20 grid gap-8 border-t border-border pt-14 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-navy">Access and control</p>
            <h2 id="control-title" className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] text-ink">Your account, your choice.</h2>
          </div>
          <div className="space-y-5 text-sm leading-7 text-ink-muted">
            <p>Signal shows what each connected platform makes available. An unavailable count is marked unavailable, not shown as an invented number. Disconnect a platform from Accounts and manage optional AI settings in Settings.</p>
            <p>See the <Link href="/privacy" className="font-semibold text-navy underline underline-offset-4">Privacy Policy</Link> for how account data is used and stored. The <Link href="/terms" className="font-semibold text-navy underline underline-offset-4">Terms of Service</Link> describe use of Signal. Both pages can be read without signing in.</p>
          </div>
        </section>
      </div>
    </PublicSiteShell>
  );
}
