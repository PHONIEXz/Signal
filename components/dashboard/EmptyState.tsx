import SignalDots from "@/components/SignalDots";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-surface px-8 py-16 text-center">
      <p className="font-display text-xl font-medium text-ink">
        No accounts connected yet
      </p>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        Connect a platform to start pulling in your metrics. You can add more
        later - each one shows up here as its own signal.
      </p>
      <div className="mt-8">
        <a
          href="/api/connect/x/start"
          className="inline-block rounded-md bg-navy px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-dark"
        >
          Connect X
        </a>
      </div>
      <div className="mt-10 border-t border-border pt-8">
        <SignalDots />
      </div>
    </div>
  );
}

