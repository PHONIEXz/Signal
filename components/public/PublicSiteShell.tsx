import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import LegalLinks from "@/components/LegalLinks";
import SupportContact from "@/components/SupportContact";

export default function PublicSiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-border bg-surface">
        <div className="border-b border-border bg-paper">
          <div className="mx-auto flex max-w-7xl justify-end px-5 py-2 sm:px-8">
            <LegalLinks />
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Signal home"><BrandMark /></Link>
          <nav aria-label="Product" className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium sm:order-2 sm:w-auto">
            <Link href="/product" className="text-ink-muted hover:text-ink">How it works</Link>
            <Link href="/product#tiktok" className="text-ink-muted hover:text-ink">TikTok integration</Link>
          </nav>
          <div className="order-2 flex items-center gap-3 sm:order-3">
            <Link href="/login" className="text-sm font-semibold text-navy hover:underline">Log in</Link>
            <Link href="/signup" className="rounded-lg bg-action px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-action-hover sm:text-sm">Create account</Link>
          </div>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-7 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <Link href="/" aria-label="Signal home"><BrandMark /></Link>
            <p className="mt-4 max-w-md text-xs leading-6 text-ink-muted">A creator workspace for account analytics, insights, reports and content drafts. Data access depends on each platform.</p>
            <p className="mt-3 text-xs text-ink-muted">Questions? <SupportContact /></p>
          </div>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <Link href="/product" className="text-xs font-medium text-navy hover:underline">Product guide</Link>
            <LegalLinks />
          </div>
        </div>
      </footer>
    </div>
  );
}
