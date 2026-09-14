import AccountCard from "@/components/dashboard/AccountCard";

type Connection = {
  id: string;
  platform: string;
  createdAt: Date;
  followers: number | null;
};

const ALL_PLATFORMS = [
  { key: "x", label: "X", mark: "X", connectHref: "/api/connect/x/start", available: true },
  { key: "facebook", label: "Facebook", mark: "f", connectHref: "/api/connect/facebook/start", available: true },
  { key: "tiktok", label: "TikTok", mark: "♪", connectHref: "/api/connect/tiktok/start", available: true },
  { key: "instagram", label: "Instagram", mark: "◎", connectHref: null, available: false },
  { key: "linkedin", label: "LinkedIn", mark: "in", connectHref: null, available: false },
  { key: "youtube", label: "YouTube", mark: "▶", connectHref: null, available: false },
];

export default function AccountsList({ connections, plan }: { connections: Connection[]; plan: string }) {
  const connectedKeys = new Set(connections.map((connection) => connection.platform));
  const remaining = ALL_PLATFORMS.filter((platform) => !connectedKeys.has(platform.key));
  const isPro = plan.toUpperCase() === "PRO";
  const freeLimitReached = !isPro && connections.length >= 1;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-navy">Connections</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.035em] text-ink">Your accounts</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
          Bring each channel into one workspace and keep your performance picture complete.
        </p>
      </div>

      <div className="surface-card relative overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-navy to-amber" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Current plan</p>
            <p className="mt-1 font-display text-xl font-semibold text-ink">{isPro ? "Signal Pro" : "Signal Free"}</p>
          </div>
          <span className="rounded-full border border-border bg-paper px-3 py-1.5 text-xs font-semibold text-ink-muted">
            {isPro ? "Multiple accounts" : `${connections.length}/1 account used`}
          </span>
        </div>
        {freeLimitReached && (
          <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-ink-muted">
            The Free plan includes one linked social account. Upgrade to Pro to connect more platforms.
          </p>
        )}
      </div>

      <section>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Connected</h2>
            <p className="mt-1 text-xs text-ink-muted">Live channels feeding your dashboard</p>
          </div>
          <span className="rounded-full bg-connected/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-connected">
            {connections.length} live
          </span>
        </div>

        {connections.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border bg-surface/60 p-8 text-center text-sm text-ink-muted">
            No accounts connected yet.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {connections.map((connection) => (
              <AccountCard key={connection.id} id={connection.id} platform={connection.platform} followers={connection.followers} />
            ))}
          </div>
        )}
      </section>

      {remaining.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold text-ink">Available platforms</h2>
          <p className="mt-1 text-xs text-ink-muted">Add your next source of audience data</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {remaining.map((platform) => {
              const requiresPro = platform.available && freeLimitReached;
              return (
                <div key={platform.key} className="surface-card flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper font-display text-sm font-bold text-ink">
                      {platform.mark}
                    </span>
                    <span className="truncate text-sm font-semibold text-ink">{platform.label}</span>
                  </div>

                  {!platform.available ? (
                    <span className="rounded-lg border border-border px-3 py-2 text-[10px] font-semibold text-ink-muted">Soon</span>
                  ) : requiresPro ? (
                    <span className="rounded-lg bg-paper px-3 py-2 text-[10px] font-semibold text-ink-muted">Pro</span>
                  ) : (
                    <a href={platform.connectHref!} className="rounded-xl bg-navy px-4 py-2 text-xs font-semibold text-white shadow-md shadow-navy/15 transition-all hover:-translate-y-0.5 hover:bg-navy-dark">
                      Connect
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
