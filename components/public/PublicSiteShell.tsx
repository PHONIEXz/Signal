import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import LegalLinks from "@/components/LegalLinks";
import SupportContact from "@/components/SupportContact";

export default function PublicSiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-5 py-5 sm:px-8">
          <Link href="/" aria-label="Signal home"><BrandMark /></Link>
          <nav aria-label="Product" className="order-3 flex w-full flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4 text-sm font-medium sm:order-2 sm:w-auto sm:border-0 sm:pt-0">
            <Link href="/product" className="text-ink-muted underline-offset-8 hover:text-ink hover:underline">The product</Link>
            <Link href="/product#tiktok" className="text-ink-muted underline-offset-8 hover:text-ink hover:underline">For TikTok</Link>
          </nav>
          <div className="order-2 flex items-center gap-3 sm:order-3">
            <Link href="/login" className="text-sm font-semibold text-navy hover:underline">Log in</Link>
            <Link href="/signup" className="rounded-md bg-action px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-action-hover sm:text-sm">Start with Signal <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-9 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow mb-5">A clearer view of your channels</p>
            <Link href="/" aria-label="Signal home"><BrandMark /></Link>
            <p className="mt-5 max-w-md text-sm leading-6 text-ink-muted">Account analytics, reports and content drafts in one focused workspace. Available data depends on each platform.</p>
            <p className="mt-3 text-xs text-ink-muted">Questions? <SupportContact /></p>
          </div>
          <div className="flex flex-col items-start gap-4 border-t border-border pt-6 md:items-end md:border-0 md:pt-0">
            <Link href="/product" className="text-sm font-medium text-navy hover:underline">How Signal works ↗</Link>
            <LegalLinks />
          </div>
        </div>
      </footer>
    </div>
  );
}
