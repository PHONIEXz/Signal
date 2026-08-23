type Connection = {
  id: string;
  platform: string;
  createdAt: Date;
};

export default function ConnectedList({
  connections,
}: {
  connections: Connection[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {connections.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between rounded-lg border border-border bg-surface px-5 py-4"
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
            Connected {new Date(c.createdAt).toLocaleDateString("en-US", {
              dateStyle: "medium",
            })}
          </span>
        </div>
      ))}
      <a
        href="/api/connect/x/start"
        className="mt-2 inline-block w-fit rounded-md border border-border px-4 py-2 text-sm text-ink-muted transition-colors hover:border-navy hover:text-ink"
      >
        Connect another account
      </a>
    </div>
  );
}

