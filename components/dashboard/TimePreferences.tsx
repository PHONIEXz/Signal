"use client";

import { useState, useSyncExternalStore } from "react";
import { metricTime, validTimeZone } from "@/lib/metric-time";

const storageKey = "signal.time-zone.v1";
const changeEvent = "signal-time-zone-change";
const serverPreference = () => "UTC";
function readPreference() {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved && validTimeZone(saved) ? saved : "auto";
  } catch { return "auto"; }
}
function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === storageKey || event.key === null) listener(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(changeEvent, listener);
  };
}
export function useTimeZone() {
  const preference = useSyncExternalStore(subscribe, readPreference, serverPreference);
  return preference === "auto" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" : preference;
}
export function LocalTime({ value }: { value: string | number | Date }) {
  const zone = useTimeZone();
  const date = new Date(value);
  return <time dateTime={Number.isFinite(date.getTime()) ? date.toISOString() : undefined}>{metricTime(value, zone)}</time>;
}
export default function TimePreferences() {
  const [error, setError] = useState("");
  const preference = useSyncExternalStore(subscribe, readPreference, serverPreference);
  const zone = useTimeZone();
  const zones = Array.from(new Set(["Africa/Lagos", "UTC", zone, ...(typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["Europe/London", "America/New_York", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney"])])).sort();
  return <div className="border-t border-border p-5 sm:p-6">
    <label htmlFor="display-time-zone" className="block font-semibold text-ink">Time zone</label>
    <p id="time-zone-description" className="mt-1 text-sm leading-6 text-ink-muted">Choose how dates and times appear across your dashboard. Saved on this browser.</p>
    <select id="display-time-zone" aria-describedby="time-zone-description time-zone-status" value={preference}
      onChange={event => {
        try { localStorage.setItem(storageKey, event.target.value); }
        catch { setError("Your browser blocked saving this preference. Allow site storage and try again."); return; }
        setError("");
        window.dispatchEvent(new Event(changeEvent));
      }}
      className="mt-3 min-h-11 w-full rounded-xl border border-border bg-paper px-3 py-2 text-sm text-ink sm:max-w-md">
      <option value="auto">Automatic — use device time zone</option>
      {zones.map(value => <option key={value} value={value}>{value === "Africa/Lagos" ? "Nigeria — WAT (Africa/Lagos, UTC+01:00)" : value.replaceAll("_", " ")}</option>)}
    </select>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    <p id="time-zone-status" role="status" className="mt-2 text-xs leading-6 text-ink-muted">Displaying times in {zone === "Africa/Lagos" ? "WAT (Africa/Lagos)" : zone}. Chart periods and allowance resets are calculated in UTC; their displayed times use your selection.</p>
  </div>;
}
