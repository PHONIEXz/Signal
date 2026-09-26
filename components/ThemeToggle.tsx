"use client";

import { useSyncExternalStore } from "react";

function subscribeToTheme(onChange: () => void) {
  const syncFromStorage = (event: StorageEvent) => {
    if (event.key !== "theme") return;
    document.documentElement.classList.toggle("dark", event.newValue === "dark");
    onChange();
  };
  window.addEventListener("signal-theme-change", onChange);
  window.addEventListener("storage", syncFromStorage);
  return () => {
    window.removeEventListener("signal-theme-change", onChange);
    window.removeEventListener("storage", syncFromStorage);
  };
}

function currentTheme() {
  return document.documentElement.classList.contains("dark");
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribeToTheme, currentTheme, () => false);
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // The theme still works for this page if storage is unavailable.
    }
    window.dispatchEvent(new Event("signal-theme-change"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Light mode" : "Dark mode"}
      className="group relative flex h-9 w-[68px] items-center justify-between rounded-full border border-border bg-surface px-2 text-ink-muted shadow-sm transition-all duration-300 hover:border-navy/35 hover:text-ink"
    >
      <SunIcon />
      <MoonIcon />
      <span
        className={`absolute left-1 top-1 h-7 w-7 rounded-full bg-navy shadow-md transition-transform duration-300 ${
          isDark ? "translate-x-8" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" className="relative z-10 h-3.5 w-3.5" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6L16 16M16 4l-1.4 1.4M5.4 14.6L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" className="relative z-10 h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path d="M15.8 12.7A6.5 6.5 0 0 1 7.3 4.2a6.5 6.5 0 1 0 8.5 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
