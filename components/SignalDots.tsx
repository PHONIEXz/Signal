type Platform = {
  name: string;
  connected: boolean;
};

const PLATFORMS: Platform[] = [
  { name: "instagram", connected: false },
  { name: "x", connected: true },
  { name: "tiktok", connected: false },
  { name: "linkedin", connected: false },
  { name: "youtube", connected: false },
];

export default function SignalDots() {
  return (
    <ul className="flex flex-col gap-3">
      {PLATFORMS.map((platform) => (
        <li key={platform.name} className="flex items-center gap-3">
          <span
            className={
              platform.connected
                ? "h-2.5 w-2.5 rounded-full bg-connected animate-pulse-dot"
                : "h-2.5 w-2.5 rounded-full border border-ink-muted/40"
            }
            aria-hidden="true"
          />
          <span className="font-mono text-xs text-ink-muted">
            {platform.name}
            <span className="mx-2 text-ink-muted/50">·</span>
            {platform.connected ? "connected" : "not connected"}
          </span>
        </li>
      ))}
    </ul>
  );
}

