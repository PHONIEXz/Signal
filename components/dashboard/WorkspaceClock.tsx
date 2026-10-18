"use client";
import { useEffect, useState } from "react";
export default function WorkspaceClock({ initialTime }: {initialTime: string}) {
  const [time, setTime] = useState(initialTime);
  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date().toISOString()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  return <time dateTime={time} className="mt-1 block text-xs tabular-nums text-ink-muted">{new Date(time).toLocaleString("en-GB", {timeZone:"UTC",weekday:"short",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})} UTC</time>;
}
