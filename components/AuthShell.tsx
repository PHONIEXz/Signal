import BrandMark from "./BrandMark";
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
    <div className="relative flex min-h-screen overflow-hidden bg-paper">
      <div className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-amber/10 blur-3xl lg:hidden" />

      <aside className="relative hidden min-h-screen w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-navy px-12 py-11 text-white lg:flex xl:px-16 xl:py-14">
        <div className="auth-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -left-36 bottom-[-10rem] h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-24 h-64 w-64 rounded-full bg-amber/20 blur-3xl" />

        <BrandMark inverse className="relative z-10" />

        <div className="relative z-10 max-w-lg animate-rise-in">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
            Your audience, in focus
          </p>
          <h2 className="mt-5 max-w-md font-display text-4xl font-semibold leading-[1.1] tracking-[-0.035em] xl:text-5xl">
            Clarity across every channel.
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-white/[0.68]">
            Track performance, understand what resonates, and turn scattered
            social data into your next smart move.
          </p>

          <div className="mt-9 grid max-w-md grid-cols-3 gap-3">
            {[
              ["6", "platforms"],
              ["1", "clear view"],
              ["24/7", "signal"],
            ].map(([value, label], index) => (
              <div
                key={label}
                className="rounded-2xl border border-white/12 bg-white/[0.07] px-4 py-4 backdrop-blur-sm animate-rise-in"
                style={{ animationDelay: `${180 + index * 90}ms` }}
              >
                <p className="font-display text-xl font-semibold">{value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-white/50">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 max-w-md rounded-2xl border border-white/12 bg-white/[0.07] p-5 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/48">
              Live connections
            </p>
            <span className="h-1.5 w-1.5 rounded-full bg-connected animate-pulse-dot" />
          </div>
          <SignalDots inverse />
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col">
        <div className="absolute right-5 top-5 z-20 sm:right-8 sm:top-7">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-20 sm:px-8">
          <div className="w-full max-w-[430px] animate-rise-in">
            <BrandMark className="mb-12 lg:hidden" />

            <div className="surface-card bg-surface/[0.88] p-6 backdrop-blur-xl sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-navy">
                Welcome to Signal
              </p>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.035em] text-ink">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-ink-muted">{subtitle}</p>
              <div className="mt-8">{children}</div>
            </div>

            <footer className="mt-7 flex items-center justify-center gap-3 text-xs text-ink-muted">
              <a href="/privacy" className="transition-colors hover:text-ink">
                Privacy
              </a>
              <span aria-hidden="true">·</span>
              <a href="/terms" className="transition-colors hover:text-ink">
                Terms
              </a>
              <span aria-hidden="true">·</span>
              <span>Built for focused creators</span>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
