"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { POST_SAMPLE_OPTIONS, type Plan } from "@/lib/metrics";

export default function PostSampleSelector({
  plan,
  selected,
}: {
  plan: Plan;
  selected: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function changeSample(value: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("posts", String(value));
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-ink">Recent-post sample</p>
          <p className="mt-1 text-xs text-ink-muted">
            Calculate likes, views and engagement from the latest selected posts on each platform.
          </p>
        </div>

        <select
          value={selected}
          onChange={(event) => changeSample(Number(event.target.value))}
          className="rounded-xl border border-border bg-paper px-3 py-2.5 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-navy/30"
          aria-label="Number of recent posts to analyze"
        >
          {POST_SAMPLE_OPTIONS.map((option) => {
            const locked = plan !== "PRO" && option > 10;
            return (
              <option key={option} value={option} disabled={locked}>
                Last {option} posts{locked ? " (Pro)" : ""}
              </option>
            );
          })}
        </select>
      </div>

      {plan !== "PRO" && <span className="shrink-0 rounded-full bg-amber/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600">Free up to 10</span>}
    </div>
  );
}
