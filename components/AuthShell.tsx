import SignalDots from "./SignalDots";
import ThemeToggle from "./ThemeToggle";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen">
      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>
      {/* Left panel - brand + signature signal dots, hidden on small screens */}
      <div className="hidden w-[380px] flex-col justify-between bg-navy px-10 py-12 text-white lg:flex">
        <div>
          <span className="font-display text-lg font-medium">Signal</span>
        </div>
        <div>
          <p className="font-display text-2xl leading-snug">
            One dashboard for every platform you post on.
          </p>
        </div>
        <div className="rounded-lg border border-white/15 bg-white/5 p-5">
          <p className="mb-4 font-mono text-xs uppercase tracking-wide text-white/50">
            Example connections
          </p>
          <SignalDots />
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-medium text-ink">
            {title}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  ); 
}

<footer className="mt-8 text-center text-xs text-ink-muted">
  <a href="/privacy" className="hover:text-ink">
    Privacy
  </a>
  {" · "}
  <a href="/terms" className="hover:text-ink">
    Terms
  </a>
</footer>