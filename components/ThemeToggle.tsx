"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  if (!mounted) {
    return <div className="h-8 w-14" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      aria-pressed={isDark}
      className="relative h-8 w-14 rounded-full border border-border bg-paper transition-colors"
    >
      <span
        className={
          isDark
            ? "absolute left-1 top-1 h-6 w-6 translate-x-6 rounded-full bg-navy transition-transform"
            : "absolute left-1 top-1 h-6 w-6 translate-x-0 rounded-full bg-navy transition-transform"
        }
      />
    </button>
  );
}

