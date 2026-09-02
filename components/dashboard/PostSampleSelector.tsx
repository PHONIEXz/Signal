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
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-ink">Recent-post sample</p>
          <p className="mt-1 text-xs text-ink-muted">
            Calculate likes, views and engagement from the latest selected posts on each platform.
          </p>
        </div>

        <select
          value={selected}
          onChange={(event) => changeSample(Number(event.target.value))}
          className="rounded-md border border-border bg-paper px-3 py-2 text-sm font-medium text-ink"
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

      {plan !== "PRO" && (
        <p className="mt-3 text-xs text-ink-muted">
          Free accounts can analyze up to 10 recent posts. Larger samples are available on Pro.
        </p>
      )}
    </div>
  );
}
