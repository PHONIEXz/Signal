"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { RefreshGate } from "@/lib/refresh-gate";

export function useRefreshGate(gate?: RefreshGate) {
  const router = useRouter();
  useEffect(() => {
    if (!gate?.availableAt) return;
    // Recheck the server when the cooldown/allowance resets; no platform fetch.
    const timer = window.setTimeout(() => router.refresh(), Math.min(2_147_000_000, Math.max(0, Date.parse(gate.availableAt) - Date.now()) + 1000));
    return () => window.clearTimeout(timer);
  }, [gate?.availableAt,router]);
  return Boolean(gate?.reason);
}
