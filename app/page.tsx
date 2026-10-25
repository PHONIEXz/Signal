import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteShell from "@/components/public/PublicSiteShell";
import WorkspacePreview from "@/components/public/WorkspacePreview";
import ChannelTiles from "@/components/public/ChannelTiles";

export const metadata: Metadata = {
  title: "SocialPanora | Your social world. One clear view.",
  description: "Connect your social channels, understand available performance data and plan your next post in one workspace.",
};
const features = [
  ["01", "Connect your channels", "Authorize X, Facebook or TikTok through the platform itself. See your connected accounts together, with control over what you share.", "↗"],
  ["02", "Find the useful patterns", "Explore saved measurements, compare recorded snapshots and understand where your data is incomplete.", "▥"],
  ["03", "Turn insight into action", "Ask a question, generate a focused report or prepare your next draft. Review every delivery before you publish.", "✦"],
];
export default function HomePage() {
  return <PublicSiteShell>
    <section className="panora-hero">
      <p className="landing-eyebrow" data-reveal="text"><span /> A little perspective changes everything</p>
      <h1 data-reveal="text">Your channels. Your data.<br /><mark>Your next move.</mark></h1>
      <p className="hero-description">Your social world, brought into focus. Understand your audience,<br className="hidden sm:block" /> explore your performance and make room for your next idea.</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <a href="#workspace-preview" className="landing-button">Explore the demo <span aria-hidden="true">↗</span></a>
        <Link href="/signup" className="landing-button landing-button-secondary">Start your workspace</Link>
      </div>
      <p className="mt-4 text-xs text-ink-muted">Start free with one connected account.</p>
      <ChannelTiles />
    </section>
    <section className="landing-section border-t border-border" id="workflow">
      <div className="mx-auto max-w-2xl text-center"><span className="landing-tag">A clearer workflow</span><h2 data-reveal="text">Less tab switching.<br />More understanding.</h2><p className="mt-5 text-base leading-7 text-ink-muted">Everything has its place. Your accounts, your evidence and the ideas you want to put out into the world.</p></div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">{features.map(([number,title,text,icon],index)=><article key={title} data-reveal className="landing-feature">
        <span className={`feature-symbol feature-symbol-${index}`} aria-hidden="true">{icon}</span><span className="float-right font-mono text-xs text-ink-muted">{number}</span><h3 className="mt-8 text-xl font-bold tracking-tight">{title}</h3><p className="mt-4 text-sm leading-7 text-ink-muted">{text}</p><Link href="/product" className="mt-6 inline-flex items-center gap-4 text-sm font-bold text-navy">How it works <span aria-hidden="true">↗</span></Link>
      </article>)}</div>
    </section>
    <section className="landing-section pt-4" id="workspace-preview">
      <div className="mx-auto max-w-2xl text-center"><span className="landing-tag">See the bigger picture</span><h2 data-reveal="text">Meet your new<br />social workspace.</h2><p className="mt-5 leading-7 text-ink-muted">Explore the interactive example below. Switch between an overview, a content draft and a report.</p></div>
      <WorkspacePreview />
    </section>
    <section className="landing-night" id="perspective">
      <div className="landing-section">
        <p className="text-center text-sm font-semibold text-[#c1c8d5]">Good decisions need context</p>
        <h2 data-reveal="text" className="mx-auto mt-5 max-w-3xl text-center">A clear view.<br /><mark>Including the limits.</mark></h2>
        <p className="mx-auto mt-6 max-w-xl text-center leading-7 text-[#b1b7c5]">A useful dashboard helps you see what is known, what is missing and what to do next.</p>
        <div className="mt-14 grid gap-5 md:grid-cols-3">{[
          ["◎", "Evidence over guesswork", "Saved measurements have dates. Missing metrics stay unavailable. A partial sample never pretends to be your whole audience.", "/product"],
          ["✦", "AI, when you choose", "Explore questions and generate reports from available account data. Optional AI features can be turned off in Settings.", "/product"],
          ["↗", "You stay in control", "Review permissions, disconnect a platform and keep drafts until you decide to deliver them. TikTok uploads finish on TikTok.", "/product#tiktok"],
        ].map(([icon,title,text,href])=><article key={title} className="night-card" data-reveal><span className="night-icon" aria-hidden="true">{icon}</span><h3 className="mt-7 text-xl font-bold">{title}</h3><p className="mt-4 text-sm leading-7 text-[#b1b7c5]">{text}</p><Link href={href} className="mt-8 inline-flex text-sm font-semibold text-[#8db8ff]">Explore the details ↗</Link></article>)}</div>
        <div className="landing-final"><span className="landing-tag">Your social world. One clear view.</span><h2 data-reveal="text">Make your next<br />move a clearer one.</h2><Link href="/signup" className="landing-button mt-8">Create your workspace <span aria-hidden="true">↗</span></Link><p className="mt-5 text-sm text-[#b1b7c5]">One account on Free. Multiple connections require Pro.</p></div>
      </div>
    </section>
  </PublicSiteShell>;
}
