import AccountCard from "@/components/dashboard/AccountCard";

type Connection = {
  id: string;
  platform: string;
  createdAt: Date;
  followers: number | null;
};

const ALL_PLATFORMS = [
  {
    key: "x",
    label: "X",
    connectHref: "/api/connect/x/start",
    available: true,
  },
  {
    key: "facebook",
    label: "Facebook",
    connectHref: "/api/connect/facebook/start",
    available: true,
  },
  {
    key: "tiktok",
    label: "TikTok",
    connectHref: "/api/connect/tiktok/start",
    available: true,
  },
  {
    key: "instagram",
    label: "Instagram",
    connectHref: null,
    available: false,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    connectHref: null,
    available: false,
  },
  {
    key: "youtube",
    label: "YouTube",
    connectHref: null,
    available: false,
  },
];

export default function AccountsList({
  connections,
  plan,
}: {
  connections: Connection[];
  plan: string;
}) {
  const connectedKeys = new Set(connections.map((connection) => connection.platform));
  const remaining = ALL_PLATFORMS.filter(
    (platform) => !connectedKeys.has(platform.key)
  );
  const isPro = plan.toUpperCase() === "PRO";
  const freeLimitReached = !isPro && connections.length >= 1;

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-lg border border-border bg-surface px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
              Current plan
            </p>
            <p className="mt-1 font-display text-lg font-medium text-ink">
              {isPro ? "Pro" : "Free"}
            </p>
          </div>

          <span className="rounded-full border border-border px-3 py-1 text-xs text-ink-muted">
            {isPro
              ? "Multiple accounts"
              : `${connections.length}/1 account used`}
          </span>
        </div>

        {freeLimitReached && (
          <p className="mt-3 text-sm leading-6 text-ink-muted">
            The Free plan includes one linked social account. Upgrade to Pro
            to connect more platforms.
          </p>
        )}
      </div>

      <div>
        <h2 className="font-display text-lg font-medium text-ink">
          Connected
        </h2>

        {connections.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            No accounts connected yet.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {connections.map((connection) => (
              <AccountCard
                key={connection.id}
                id={connection.id}
                platform={connection.platform}
                followers={connection.followers}
              />
            ))}
          </div>
        )}
      </div>

      {remaining.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-medium text-ink">
            Available platforms
          </h2>

          <div className="mt-3 flex flex-col gap-3">
            {remaining.map((platform) => {
              const requiresPro = platform.available && freeLimitReached;

              return (
                <div
                  key={platform.key}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface px-5 py-4"
                >
                  <span className="font-mono text-sm text-ink">
                    {platform.label}
                  </span>

                  {!platform.available ? (
                    <span className="rounded-md border border-border px-4 py-1.5 text-xs text-ink-muted">
                      Coming soon
                    </span>
                  ) : requiresPro ? (
                    <span className="rounded-md border border-border bg-paper px-4 py-1.5 text-xs font-medium text-ink-muted">
                      Pro required
                    </span>
                  ) : (
                    <a
                      href={platform.connectHref!}
                      className="rounded-md bg-navy px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-navy-dark"
                    >
                      Connect
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
