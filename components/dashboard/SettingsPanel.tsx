"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";
import ChangePasswordForm from "@/components/ChangePasswordForm";

import { useEffect, useState } from "react";

type Settings = {
  hasPassword: boolean;
  name: string | null;
  email: string;
  aiInsightsEnabled: boolean;
  personalizedRecommendationsEnabled: boolean;
  analyticsCollectionEnabled: boolean;
};

type ToggleProps = {
  enabled: boolean;
  label: string;
  disabled?: boolean;
  onChange: () => void;
};

function Toggle({ enabled, label, disabled, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-11 w-14 shrink-0 rounded-full transition-colors ${
        enabled ? "bg-action" : "bg-border"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`absolute left-1 top-2 h-7 w-7 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingRow({
  title,
  description,
  enabled,
  disabled,
  saving,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  saving: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border px-5 py-5 last:border-b-0">
      <div className="min-w-0">
        <p className="font-semibold text-ink">{title}</p>
        <span className="mt-1 inline-block text-xs font-medium text-ink-muted">{saving ? "Saving…" : enabled ? "On" : "Off"}</span>
        <p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p>
      </div>

      <Toggle
        label={title}
        enabled={enabled}
        disabled={disabled || saving}
        onChange={onChange}
      />
    </div>
  );
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/settings");

        if (!response.ok) {
          throw new Error("Unable to load settings.");
        }

        const data = await response.json();
        setSettings(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load settings."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function updateSetting(
    field: keyof Pick<
      Settings,
      | "aiInsightsEnabled"
      | "personalizedRecommendationsEnabled"
      | "analyticsCollectionEnabled"
    >
  ) {
    if (!settings || saving) return;

    const nextValue = !settings[field];

    setSettings({
      ...settings,
      [field]: nextValue,
    });

    setSaving(field);
    setError("");

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [field]: nextValue,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to save setting.");
      }

      const updated = await response.json();
      setSettings(updated);
      setSavedAt(new Date().toISOString());
    } catch (err) {
      setSettings({
        ...settings,
        [field]: !nextValue,
      });

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save setting."
      );
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-lg border border-border bg-surface" />
        <div className="h-52 animate-pulse rounded-lg border border-border bg-surface" />
        <div className="h-52 animate-pulse rounded-lg border border-border bg-surface" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-lg border border-border bg-surface px-6 py-10 text-center">
        <p className="font-medium text-ink">Unable to load settings</p>
        <p className="mt-2 text-sm text-ink-muted">
          {error || "Please refresh the page and try again."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-[#173e36] p-6 text-white sm:p-8" aria-label="Account overview">
        <svg className="pointer-events-none absolute -right-10 -top-12 h-64 w-64 text-[#d9ed92]/15" aria-hidden="true" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="16"><circle cx="100" cy="100" r="70"/><circle cx="100" cy="100" r="40"/></svg>
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d9ed92] text-2xl font-bold text-[#173e36]" aria-hidden="true">{(settings.name || settings.email).slice(0,1).toUpperCase()}</span>
          <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-widest text-[#d9ed92]">Your workspace</p><h2 className="mt-1 break-words text-2xl font-bold">{settings.name || "Your Signal account"}</h2><p className="mt-1 break-all text-sm text-white/80">{settings.email}</p></div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2 text-xs"><span className="rounded-full border border-white/25 px-3 py-2">{settings.hasPassword ? "Password sign-in" : "Connected-provider sign-in"}</span><span className="rounded-full border border-white/25 px-3 py-2">Analytics {settings.analyticsCollectionEnabled ? "on" : "paused"}</span></div>
      </section>

      <nav aria-label="Settings sections" className="flex flex-wrap gap-2">
        {[["preferences","Preferences"],["data","Data & AI"],["security","Security"],["session","Session"]].map(([id,label]) => <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:border-action hover:text-action">{label}</a>)}
      </nav>
      <div role="status" aria-live="polite" className="min-h-6 text-sm text-ink-muted">{saving ? "Saving your preference…" : savedAt ? <>Saved <time dateTime={savedAt}>{new Date(savedAt).toLocaleString("en-GB", {timeZone:"UTC",dateStyle:"medium",timeStyle:"short"})} UTC</time></> : "Preferences save automatically."}</div>
      {error && <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-5 py-4 text-sm text-red-700 dark:text-red-300">{error}</p>}

      <section id="preferences" className="scroll-mt-24 overflow-hidden rounded-3xl border border-border bg-surface" aria-labelledby="preferences-title">
        <div className="border-b border-border p-5 sm:p-6"><p className="section-kicker">01 / Make it yours</p><h2 id="preferences-title" className="mt-2 text-xl font-bold text-ink">Appearance & connections</h2></div>
        <div className="flex items-center justify-between gap-5 p-5 sm:p-6"><div><h3 className="font-semibold text-ink">Colour theme</h3><p className="mt-1 text-sm text-ink-muted">Switch between light and dark on this browser.</p></div><ThemeToggle /></div>
        <Link href="/dashboard/accounts" className="flex min-h-16 items-center justify-between gap-4 border-t border-border px-5 py-4 text-sm font-semibold text-ink hover:bg-paper sm:px-6">Manage connected accounts <span aria-hidden="true">↗</span></Link>
      </section>

      <section id="data" className="scroll-mt-24 overflow-hidden rounded-3xl border border-border bg-surface" aria-labelledby="data-title">
        <div className="border-b border-border p-5 sm:p-6"><p className="section-kicker">02 / You decide</p><h2 id="data-title" className="mt-2 text-xl font-bold text-ink">Data & intelligence</h2><p className="mt-2 text-sm leading-6 text-ink-muted">Choose what Signal collects and how AI can use it.</p></div>
        <SettingRow title="Analytics collection" description="Collect daily snapshots and allow manual refreshes. Turning this off pauses new collection; your saved history stays available." enabled={settings.analyticsCollectionEnabled} disabled={saving !== null} saving={saving === "analyticsCollectionEnabled"} onChange={() => updateSetting("analyticsCollectionEnabled")} />
        <SettingRow title="AI insights" description="Allow AI insights about your available social performance." enabled={settings.aiInsightsEnabled} disabled={saving !== null} saving={saving === "aiInsightsEnabled"} onChange={() => updateSetting("aiInsightsEnabled")} />
        <SettingRow title="Personalized recommendations" description="Allow account and post analysis, recommendations and reports. Turning this off pauses these AI features." enabled={settings.personalizedRecommendationsEnabled} disabled={saving !== null} saving={saving === "personalizedRecommendationsEnabled"} onChange={() => updateSetting("personalizedRecommendationsEnabled")} />
        <div className="border-t border-border bg-paper p-5 text-xs leading-6 text-ink-muted sm:px-6">Scheduled collection: daily at 06:00 UTC, subject to platform permissions and usage limits. The exact collection time appears on each account page.</div>
      </section>

      <section id="security" className="scroll-mt-24 rounded-3xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="security-title">
        <p className="section-kicker">03 / Keep access secure</p><h2 id="security-title" className="mt-2 text-xl font-bold text-ink">Password & security</h2>
        {settings.hasPassword ? <><p className="mt-2 text-sm leading-6 text-ink-muted">Update your password or recover access to your account.</p><details className="mt-5 rounded-2xl border border-border p-4"><summary className="cursor-pointer py-2 text-sm font-semibold text-ink">Change password</summary><ChangePasswordForm /></details><Link href="/forgot-password" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-navy hover:underline">Forgot your current password?</Link></> : <p className="mt-3 text-sm leading-6 text-ink-muted">You sign in through a connected provider. Manage your password and verification with that provider.</p>}
      </section>
      <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="deletion-title">
        <h2 id="deletion-title" className="text-lg font-bold text-ink">Your data, your choice</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">Unlink Facebook to delete its saved connection and history. For a full Signal account deletion request, follow our instructions.</p>
        <Link href="/data-deletion" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-navy underline">View deletion instructions</Link>
      </section>
      <section id="session" className="scroll-mt-24 flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="session-title">
        <div><h2 id="session-title" className="text-lg font-bold text-ink">Current session</h2><p className="mt-1 text-sm text-ink-muted">Sign out of Signal on this device.</p></div><button type="button" onClick={() => signOut({callbackUrl:"/login"})} className="min-h-11 rounded-xl border border-border px-5 text-sm font-semibold text-ink hover:bg-paper">Sign out</button>
      </section>
    </div>
  );
}
