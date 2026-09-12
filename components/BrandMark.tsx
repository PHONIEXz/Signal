type BrandMarkProps = {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
};

export default function BrandMark({
  inverse = false,
  compact = false,
  className = "",
}: BrandMarkProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-action text-white shadow-lg shadow-navy/20">
        <span className="absolute inset-1 rounded-[10px] border border-white/15" />
        <svg
          viewBox="0 0 32 32"
          className="relative h-7 w-7"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 20.5c3.4 0 3.4-9 6.8-9s3.4 12 6.8 12 3.4-15 6.8-15"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <circle cx="25.4" cy="8.5" r="2.4" fill="var(--color-amber)" />
        </svg>
      </span>

      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={`font-display text-lg font-semibold tracking-[-0.02em] ${
              inverse ? "text-white" : "text-ink"
            }`}
          >
            Signal
          </span>
          <span
            className={`mt-1 max-w-40 text-xs leading-4 ${
              inverse ? "text-white/50" : "text-ink-muted"
            }`}
          >
            Your platforms, one dashboard
          </span>
        </span>
      )}
    </div>
  );
}
