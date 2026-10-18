"use client";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/components/motion/useMotion";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 500);
    update();
    window.addEventListener("scroll", update, {passive: true});
    return () => window.removeEventListener("scroll", update);
  }, []);
  if (!visible) return null;
  return <button type="button" aria-label="Return to top of account" onClick={() => {
    document.getElementById("account-heading")?.focus({preventScroll: true});
    window.scrollTo({top: 0, behavior: reduced ? "instant" : "smooth"});
  }} className="fixed bottom-28 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-ink shadow-lg transition-colors hover:bg-action hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action lg:bottom-7 lg:right-8" title="Back to top">
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 12 6-6 6 6M12 6v14" /></svg>
  </button>;
}
