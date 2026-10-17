"use client";

import { useState } from "react";
import Link from "next/link";

const views = ["Overview", "Content Studio", "Reports"] as const;
type View = (typeof views)[number];

/** A labelled product illustration; these example values are never live account metrics. */
export default function WorkspacePreview() {
  const [view, setView] = useState<View>("Overview");
  return (
    <div className="relative mt-12 overflow-hidden rounded-[1.75rem] bg-[#2457e7] p-4 pt-6 sm:mt-16 sm:p-8 lg:p-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.16em]">
          A little perspective changes everything.
        </p>
        <span className="rounded-full border border-white/30 px-3 py-1 text-xs">
          Interactive product preview
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl bg-[#f5f6f8] text-[#172524] shadow-2xl shadow-[#071b69]/25">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e6e9] bg-white px-4 py-4 sm:px-6">
          <span className="text-lg font-bold tracking-tight">
            signal<span className="text-[#2457e7]">.</span>
          </span>
          <div
            className="flex gap-1 rounded-full bg-[#f0f2f6] p-1"
            role="group"
            aria-label="Preview section"
          >
            {views.map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={view === name}
                onClick={() => setView(name)}
                className={`min-h-10 rounded-full px-3 text-xs font-semibold transition-colors sm:px-4 ${view === name ? "bg-[#2457e7] text-white shadow-sm" : "text-[#526071] hover:bg-white"}`}
              >
                {name}
              </button>
            ))}
          </div>
          <span className="hidden text-xs text-[#626f70] sm:block">
            Example workspace
          </span>
        </div>
        <div className="min-h-[380px] p-4 sm:p-6 lg:p-8" aria-live="polite">
          <div key={view} className="animate-rise-in">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs text-[#626f70]">
                  Your next move starts here
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">
                  {view === "Overview"
                    ? "The bigger picture"
                    : view === "Content Studio"
                      ? "An idea worth sharing"
                      : "Make the numbers useful"}
                </h2>
              </div>
              <span className="rounded-full bg-white px-3 py-2 text-xs text-[#626f70]">
                Illustrative data
              </span>
            </div>
            {view === "Overview" ? (
              <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
                <div className="rounded-2xl border border-[#e2e6e9] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Audience perspective
                    </span>
                    <span className="text-xs text-[#626f70]">
                      Example trend
                    </span>
                  </div>
                  <p className="mt-4 text-4xl font-bold tracking-tight">
                    12,840
                    <span className="ml-3 text-xs font-medium text-[#626f70]">
                      followers
                    </span>
                  </p>
                  <svg
                    viewBox="0 0 540 150"
                    className="mt-5 h-36 w-full"
                    role="img"
                    aria-label="Illustrative audience trend, not live data"
                  >
                    <path d="M0 35H540M0 85H540M0 135H540" stroke="#edf0f3" />
                    <path
                      d="M0 130C40 130 30 100 75 105S120 145 160 100S200 110 245 65S300 100 350 48S410 70 455 28S510 40 540 8"
                      fill="none"
                      stroke="#2457e7"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="flex justify-between text-xs text-[#626f70]">
                    <span>Earlier snapshot</span>
                    <span>Latest snapshot</span>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex-1 rounded-2xl bg-[#e3eacb] p-5">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      From insight to idea
                    </span>
                    <h3 className="mt-4 text-xl font-bold tracking-tight">
                      Notice a pattern.
                      <br />
                      Try something new.
                    </h3>
                    <p className="mt-3 text-sm leading-6">
                      Explore what resonates before planning your next post.
                    </p>
                  </div>
                  <Link
                    href="/product"
                    className="flex items-center justify-between rounded-2xl bg-[#173e36] p-5 text-sm font-semibold text-white"
                  >
                    See how Signal works <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </div>
            ) : view === "Content Studio" ? (
              <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
                <div className="rounded-2xl border border-[#e2e6e9] bg-white p-6">
                  <span className="rounded-full bg-[#e9efff] px-3 py-1 text-xs font-semibold text-[#2457e7]">
                    Draft example
                  </span>
                  <h3 className="mt-6 text-2xl font-bold">
                    Small steps. Fresh perspectives.
                  </h3>
                  <p className="mt-4 max-w-lg text-sm leading-7 text-[#626f70]">
                    A behind-the-scenes look at the work, the lessons and the
                    ideas taking shape. What would you like to see next?
                  </p>
                  <div className="mt-7 border-t border-[#e2e6e9] pt-4 text-xs text-[#626f70]">
                    Write → Choose a channel → Review delivery
                  </div>
                </div>
                <div className="rounded-2xl bg-[#f6d9c6] p-6">
                  <h3 className="text-xl font-bold">
                    Your draft, your decision.
                  </h3>
                  <p className="mt-4 text-sm leading-7">
                    Save your work, review the media and select a connected
                    account. Delivery options depend on the platform.
                  </p>
                  <Link
                    href="/signup"
                    className="mt-6 inline-flex text-sm font-bold underline underline-offset-4"
                  >
                    Open your own workspace ↗
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
                <div className="rounded-2xl border border-[#e2e6e9] bg-white p-6">
                  <h3 className="text-lg font-bold">A report with context</h3>
                  {[
                    "What the available data shows",
                    "Where the picture is incomplete",
                    "Questions for your next post",
                  ].map((label, i) => (
                    <div
                      key={label}
                      className="mt-4 flex items-center gap-4 border-b border-[#e2e6e9] pb-4"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9efff] text-xs font-bold text-[#2457e7]">
                        0{i + 1}
                      </span>
                      <span className="text-sm font-semibold">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-[#dce5ff] p-6">
                  <h3 className="text-xl font-bold">
                    More context.
                    <br />
                    Less guesswork.
                  </h3>
                  <p className="mt-4 text-sm leading-7">
                    Review your connected accounts and available performance in
                    one place. Optional AI reports depend on your settings and
                    service availability.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-white/85">
        Product illustration with example content. Your dashboard shows only
        your available account data.
      </p>
    </div>
  );
}
