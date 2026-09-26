import BrandMark from "./BrandMark";
import SignalDots from "./SignalDots";
import ThemeToggle from "./ThemeToggle";
import LegalLinks from "./LegalLinks";

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
    <div className="flex min-h-screen bg-paper">
      <aside className="relative hidden min-h-screen w-[46%] max-w-[640px] flex-col justify-between overflow-hidden border-r border-[#28475b] bg-[#102f4d] px-12 py-11 text-white lg:flex xl:px-16 xl:py-14">
        <div className="dashboard-grid pointer-events-none absolute inset-0 opacity-35" />
        <BrandMark inverse className="relative z-10" />

        <div className="relative z-10 max-w-lg">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e4a16e]">The Signal workspace / 01</p>
          <h2 className="mt-7 max-w-md font-display text-5xl font-medium leading-[1.02] tracking-[-0.04em] xl:text-6xl">
            Make sense of the noise.
          </h2>
          <p className="mt-6 max-w-sm text-base leading-7 text-white/70">
            Your channels bring the data. Signal helps you see the pattern and plan what comes next.
          </p>
          <div className="mt-12 border-t border-white/20">
            {[["01", "Connect your channels"], ["02", "Read the direction"], ["03", "Shape your next post"]].map(([number, label]) => (
              <div key={number} className="flex items-center gap-6 border-b border-white/20 py-4">
                <span className="font-mono text-xs text-[#e4a16e]">{number}</span>
                <span className="text-sm font-medium text-white/85">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 max-w-md border-t border-white/20 pt-6">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">Connect to what you already use</p>
          <SignalDots inverse />
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col">
        <div className="absolute right-5 top-5 z-20 sm:right-8 sm:top-7">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-20 sm:px-8">
          <div className="w-full max-w-[440px]">
            <BrandMark className="mb-10 lg:hidden" />

            <div className="border-t-2 border-navy bg-surface p-6 shadow-soft sm:p-10">
              <p className="eyebrow">Your Signal account</p>
              <h1 className="mt-3 font-display text-4xl font-medium leading-tight tracking-[-0.04em] text-ink">
                {title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-ink-muted">{subtitle}</p>
              <div className="mt-9">{children}</div>
            </div>

            <footer className="mt-7 space-y-3 text-center">
              <LegalLinks />
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
