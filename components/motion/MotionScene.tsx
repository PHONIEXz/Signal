"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "./useMotion";

/** Content stays readable without JavaScript; only visible elements are animated. */
export default function MotionScene({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || !root.current || !("IntersectionObserver" in window)) return;
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting).forEach((entry, index) => {
        const element = entry.target as HTMLElement;
        const text = element.matches("h1,h2,[data-reveal='text']");
        animations.push(element.animate([
          { opacity: 0, transform: `translateY(${text ? 32 : 24}px) scale(${text ? 1 : 0.975})` },
          { opacity: 1, transform: "translateY(0) scale(1)" },
        ], { duration: text ? 850 : 700, delay: Math.min(index * 85, 340), easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" }));
        observer.unobserve(element);
      });
    }, { threshold: 0.12 });
    root.current.querySelectorAll("h1,h2,[data-reveal],.surface-card").forEach(element => observer.observe(element));
    return () => { observer.disconnect(); animations.forEach(animation => animation.cancel()); };
  }, [path, reduced]);
  return <div ref={root} className="contents">{children}</div>;
}
