import Link from "next/link";

type Connection = {
  id: string;
  platform: string;
  createdAt: Date;
};

const ALL_PLATFORMS = [
  { key: "x", label: "X", connectHref: "/api/connect/x/start", available: true },
  { key: "facebook", label: "Facebook", connectHref: "/api/connect/facebook/start", available: true },
  { key: "instagram", label: "Instagram", connectHref: null, available: false },
  { key: "tiktok", label: "TikTok", connectHref: "/api/connect/tiktok/start", available: true },
  { key: "linkedin", label: "LinkedIn", connectHref: null, available: false },
  { key: "youtube", label: "YouTube", connectHref: null, available: false },
];

export default function AccountsList({
  connections,
}: {
  connections: Connection[];
}) {
  const connectedKeys = new Set(connections.map((c) => c.platform));
  const remaining = ALL_PLATFORMS.filter((p) => !connectedKeys.has(p.key));

  return (
    <div className="flex flex-col gap-8">
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
            {connections.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/accounts/${c.platform}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-5 py-4 transition-colors hover:border-navy"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full bg-connected"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-sm capitalize text-ink">
                    {c.platform}
                  </span>
                </div>
                <span className="text-xs text-ink-muted">
                  Connected{" "}
                  {new Date(c.createdAt).toLocaleDateString("en-US", {
                    dateStyle: "medium",
                  })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-lg font-medium text-ink">
          Available platforms
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {remaining.map((p) => (
            <div
              key={p.key}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-5 py-4"
            >
              <span className="font-mono text-sm text-ink">{p.label}</span>
              {p.available ? (
                <a
                  href={p.connectHref!}
                  className="rounded-md bg-navy px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-navy-dark"
                >
                  Connect
                </a>
              ) : (
                <span className="rounded-md border border-border px-4 py-1.5 text-xs text-ink-muted">
                  Coming soon
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

