const PLATFORMS = ["Facebook", "X", "TikTok"];

export default function SignalDots({ inverse = false }: { inverse?: boolean }) {
  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {PLATFORMS.map((name) => <li key={name} className={"rounded-lg border px-3 py-2 text-sm " +
          (inverse ? "border-white/20 text-white" : "border-border text-ink")}>{name}</li>)}
      </ul>
      <p className={"mt-3 text-sm leading-6 " + (inverse ? "text-white/75" : "text-ink-muted")}>
        Connect an account to start. Data availability depends on each platform.
      </p>
    </div>
  );
}
