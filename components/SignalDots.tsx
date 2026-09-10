type Platform = {
  name: string;
  connected: boolean;
};

const PLATFORMS: Platform[] = [
  { name: "Facebook", connected: true },
  { name: "X", connected: true },
  { name: "TikTok", connected: false },
  { name: "Instagram", connected: false },
];

export default function SignalDots({ inverse = false }: { inverse?: boolean }) {
  return (
    <ul className="grid gap-2.5">
      {PLATFORMS.map((platform, index) => (
        <li
          key={platform.name}
          className="flex items-center justify-between gap-4 animate-rise-in"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <span className="flex items-center gap-3">
            <span
              className={
                platform.connected
                  ? "h-2.5 w-2.5 rounded-full bg-connected animate-pulse-dot"
                  : `h-2.5 w-2.5 rounded-full border ${
                      inverse ? "border-white/25" : "border-ink-muted/35"
                    }`
              }
              aria-hidden="true"
            />
            <span
              className={`font-mono text-xs ${
                inverse ? "text-white/72" : "text-ink-muted"
              }`}
            >
              {platform.name}
            </span>
          </span>

          <span
            className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${
              platform.connected
                ? "bg-connected/15 text-connected"
                : inverse
                  ? "bg-white/[0.08] text-white/35"
                  : "bg-paper text-ink-muted"
            }`}
          >
            {platform.connected ? "live" : "ready"}
          </span>
        </li>
      ))}
    </ul>
  );
}
