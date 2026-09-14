import Link from "next/link";

export default function LegalLinks({ inverse = false }: { inverse?: boolean }) {
  const linkClass = inverse
    ? "text-white/65 hover:text-white"
    : "text-ink-muted hover:text-ink";

  return (
    <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs">
      <Link href="/privacy" className={`font-medium transition-colors ${linkClass}`}>Privacy Policy</Link>
      <span className={inverse ? "text-white/25" : "text-border"} aria-hidden="true">•</span>
      <Link href="/terms" className={`font-medium transition-colors ${linkClass}`}>Terms of Service</Link>
    </nav>
  );
}
