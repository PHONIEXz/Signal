"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRef, useState } from "react";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import ThemeToggle from "@/components/ThemeToggle";

export type Settings = {
  hasPassword: boolean;
  name: string | null;
  email: string;
  aiInsightsEnabled: boolean;
  personalizedRecommendationsEnabled: boolean;
  analyticsCollectionEnabled: boolean;
};
type PreferenceField = "aiInsightsEnabled" | "personalizedRecommendationsEnabled" | "analyticsCollectionEnabled";

const preferenceNames: Record<PreferenceField, string> = {
  aiInsightsEnabled: "AI insights",
  personalizedRecommendationsEnabled: "Personalized recommendations",
  analyticsCollectionEnabled: "Analytics collection",
};
const sections = [
  ["#account", "Account"], ["#ai", "Signal AI"], ["#data", "Data & privacy"],
  ["#appearance", "Appearance"], ["#security", "Security"], ["#session", "Session"],
];

function PreferenceRow({ id, title, description, enabled, disabled, saving, onChange }: {
  id: string; title: string; description: string; enabled: boolean;
  disabled: boolean; saving: boolean; onChange: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-border px-5 py-5 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
      <div className="min-w-0">
        <h3 id={id + "-title"} className="text-sm font-semibold text-ink">{title}</h3>
        <p id={id + "-description"} className="mt-1 max-w-xl text-sm leading-6 text-ink-muted">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 self-end sm:self-auto">
        <span aria-hidden="true" className="min-w-12 text-right text-xs font-semibold text-ink-muted">
          {saving ? "Saving…" : enabled ? "On" : "Off"}
        </span>
        <button
          type="button" role="switch" aria-checked={enabled}
          aria-labelledby={id + "-title"} aria-describedby={id + "-description"}
          disabled={disabled} onClick={onChange}
          className={"relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-navy " +
            (enabled ? "bg-connected" : "bg-ink-muted/50") + (disabled ? " cursor-wait opacity-60" : " cursor-pointer")}
        >
          <span className={"absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform " + (enabled ? "translate-x-5" : "")} />
        </button>
      </div>
    </div>
  );
}

export default function SettingsPanel({ initialSettings }: { initialSettings: Settings | null }) {
  const [settings, setSettings] = useState<Settings | null>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<PreferenceField | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const savingRef = useRef(false);

  async function retryLoad() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/settings", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load your settings.");
      const data: Settings = await response.json();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your settings.");
    } finally {
      setLoading(false);
    }
  }

  async function updateSetting(field: PreferenceField) {
    if (!settings || savingRef.current) return;
    savingRef.current = true;
    setSaving(field);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !settings[field] }),
      });
      const updated = await response.json().catch(() => null);
      if (!response.ok) throw new Error(updated?.error || "Unable to save this preference. Please try again.");
      setSettings(updated as Settings);
      setNotice(preferenceNames[field] + " saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save this preference.");
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  }

  function signOutOfSignal() {
    try {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith("signal-draft:")) sessionStorage.removeItem(key);
      }
    } catch {
      // Storage can be disabled; signing out must still work.
    }
    void signOut({ callbackUrl: "/login" });
  }

  if (loading) return (
    <div aria-label="Loading settings" className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="h-56 animate-pulse rounded-2xl border border-border bg-surface" />
      <div className="space-y-5">
        <div className="h-48 animate-pulse rounded-2xl border border-border bg-surface" />
        <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface" />
      </div>
    </div>
  );
  if (!settings) return (
    <div role="alert" className="surface-card px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold text-ink">Unable to load settings</p>
      <p className="mt-2 text-sm text-ink-muted">{error || "Please try again."}</p>
      <button type="button" onClick={() => void retryLoad()} className="mt-5 rounded-xl bg-action px-5 py-2.5 text-sm font-semibold text-white hover:bg-action-hover">Try again</button>
    </div>
  );

  const identity = settings.name?.trim() || settings.email;
  const aiPaused = !settings.aiInsightsEnabled || !settings.personalizedRecommendationsEnabled;
  return (
    <div className="grid items-start gap-7 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-9">
      <nav aria-label="Settings sections" className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-3 shadow-soft lg:sticky lg:top-28 lg:flex-col lg:gap-1 lg:p-4">
        <p className="hidden px-3 pb-3 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-muted lg:block">On this page</p>
        {sections.map(([href, label]) => (
          <a key={href} href={href} className="rounded-lg px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:bg-paper hover:text-ink sm:text-sm">{label}</a>
        ))}
        <p className="hidden border-t border-border px-3 pt-4 text-xs leading-5 text-ink-muted lg:mt-4 lg:block">Preferences save as soon as you change them.</p>
      </nav>

      <div className="min-w-0 space-y-6">
        {error && <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {notice && <p role="status" className="rounded-xl border border-connected/25 bg-connected/10 px-4 py-3 text-sm text-connected">{notice}</p>}

        <section id="account" aria-labelledby="account-title" className="scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          <div className="flex flex-col gap-4 bg-[#102f4d] p-6 text-white sm:flex-row sm:items-center">
            <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 font-display text-xl font-semibold">{identity.charAt(0).toUpperCase() || "S"}</span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/65">Signal account</p>
              <h2 id="account-title" className="mt-1 break-words font-display text-xl font-semibold">{settings.name?.trim() || "Your account"}</h2>
              <p className="mt-1 break-all text-xs text-white/75">{settings.email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <p className="text-sm leading-6 text-ink-muted">Your name and email come from your Signal sign-in.</p>
            <Link href="/dashboard/accounts" className="inline-flex shrink-0 items-center text-sm font-semibold text-navy hover:underline">Manage connections <span aria-hidden="true" className="ml-1">↗</span></Link>
          </div>
        </section>

        <section id="ai" aria-labelledby="ai-title" className="scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          <div className="px-5 pb-5 pt-6 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-navy">Intelligence</p>
            <h2 id="ai-title" className="mt-1 font-display text-xl font-semibold text-ink">Signal AI</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">Choose whether Signal can analyze your account and post data for AI features.</p>
            {aiPaused && <p className="mt-4 rounded-xl border border-amber/25 bg-amber/10 px-4 py-3 text-xs leading-5 text-ink">AI features are paused. Both preferences below must be on to use account and post analysis.</p>}
          </div>
          <PreferenceRow id="ai-insights" title="AI insights" description="Permit AI answers and insights using your available account and post data." enabled={settings.aiInsightsEnabled} disabled={saving !== null} saving={saving === "aiInsightsEnabled"} onChange={() => void updateSetting("aiInsightsEnabled")} />
          <PreferenceRow id="personalization" title="Personalized recommendations" description="Permit personalized analysis and AI reports. Turning this off pauses current AI features." enabled={settings.personalizedRecommendationsEnabled} disabled={saving !== null} saving={saving === "personalizedRecommendationsEnabled"} onChange={() => void updateSetting("personalizedRecommendationsEnabled")} />
        </section>

        <section id="data" aria-labelledby="data-title" className="scroll-mt-28 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          <div className="px-5 pb-5 pt-6 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-navy">Your data</p>
            <h2 id="data-title" className="mt-1 font-display text-xl font-semibold text-ink">Data & privacy</h2>
            <p className="mt-2 text-sm leading-6 text-ink-muted">Control new analytics snapshots. Existing history stays in your account when collection is paused.</p>
          </div>
          <PreferenceRow id="analytics-collection" title="Analytics collection" description="Allow new snapshots from connected platforms for trends and reports. Turning this off also stops manual metric refreshes." enabled={settings.analyticsCollectionEnabled} disabled={saving !== null} saving={saving === "analyticsCollectionEnabled"} onChange={() => void updateSetting("analyticsCollectionEnabled")} />
          <div className="border-t border-border px-5 py-4 sm:px-6"><Link href="/privacy" className="text-sm font-semibold text-navy hover:underline">Read the privacy policy ↗</Link></div>
        </section>

        <section id="appearance" aria-labelledby="appearance-title" className="scroll-mt-28 rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-navy">Display</p>
          <h2 id="appearance-title" className="mt-1 font-display text-xl font-semibold text-ink">Appearance</h2>
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-5">
            <div><h3 className="text-sm font-semibold text-ink">Color theme</h3><p className="mt-1 text-sm leading-6 text-ink-muted">Switch between light and dark mode. Saved on this device.</p></div>
            <ThemeToggle />
          </div>
        </section>

        <section id="security" aria-labelledby="security-title" className="scroll-mt-28 rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-navy">Protect your account</p>
          <h2 id="security-title" className="mt-1 font-display text-xl font-semibold text-ink">Password & security</h2>
          {settings.hasPassword ? (
            <>
              <p className="mt-2 text-sm leading-6 text-ink-muted">Use your current password to set a new one. Changing it signs out your existing sessions.</p>
              <details className="mt-5 rounded-xl border border-border bg-paper/70 p-4 open:bg-surface">
                <summary className="cursor-pointer text-sm font-semibold text-navy">Change password</summary>
                <ChangePasswordForm />
              </details>
              <Link href="/forgot-password" className="mt-4 inline-flex text-sm font-semibold text-navy hover:underline">Forgot your current password?</Link>
            </>
          ) : <p className="mt-2 text-sm leading-6 text-ink-muted">You sign in through a connected provider. This account does not have a separate Signal password.</p>}
        </section>

        <section id="session" aria-labelledby="session-title" className="scroll-mt-28 rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
          <h2 id="session-title" className="font-display text-xl font-semibold text-ink">Session</h2>
          <div className="mt-4 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 className="text-sm font-semibold text-ink">Sign out of this device</h3><p className="mt-1 text-sm leading-6 text-ink-muted">End this session and clear locally saved draft copies from this browser.</p></div>
            <button type="button" onClick={signOutOfSignal} className="min-h-11 shrink-0 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-navy/30 hover:bg-paper">Sign out</button>
          </div>
        </section>
      </div>
    </div>
  );
}
