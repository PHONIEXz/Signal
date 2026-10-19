"use client";
import { LocalTime } from "./TimePreferences";
import { useEffect, useState } from "react";
export default function WorkspaceClock({ initialTime }: {initialTime: string}) {
  const [time, setTime] = useState(initialTime);
  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date().toISOString()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  return <span className="mt-1 block text-xs tabular-nums text-ink-muted"><LocalTime value={time} /></span>;
}
