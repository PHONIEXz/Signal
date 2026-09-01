"use client";

import { useEffect, useState } from "react";

type Settings = {
  name: string | null;
  email: string;
  aiInsightsEnabled: boolean;
  personalizedRecommendationsEnabled: boolean;
  analyticsCollectionEnabled: boolean;
};

type ToggleProps = {
  enabled: boolean;
  disabled?: boolean;
  onChange: () => void;
};

function Toggle({ enabled, disabled, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        enabled ? "bg-navy" : "bg-border"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
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
        <p className="font-medium text-ink">{title}</p>
        <p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p>
      </div>

      <Toggle
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
    if (!settings) return;

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
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section>
        <div className="mb-3">
          <h2 className="font-display text-lg font-medium text-ink">
            Account
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Your Signal account information.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex items-center justify-between gap-6 border-b border-border px-5 py-5">
            <div>
              <p className="font-medium text-ink">Name</p>
              <p className="mt-1 text-sm text-ink-muted">
                {settings.name || "Not set"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6 px-5 py-5">
            <div>
              <p className="font-medium text-ink">Email</p>
              <p className="mt-1 text-sm text-ink-muted">
                {settings.email}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="font-display text-lg font-medium text-ink">
            Signal AI
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Control how Signal AI uses your account data.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <SettingRow
            title="AI Insights"
            description="Allow Signal AI to generate insights about your social performance."
            enabled={settings.aiInsightsEnabled}
            saving={saving === "aiInsightsEnabled"}
            onChange={() => updateSetting("aiInsightsEnabled")}
          />

          <SettingRow
            title="Personalized Recommendations"
            description="Allow Signal AI to tailor recommendations to your account and activity."
            enabled={settings.personalizedRecommendationsEnabled}
            saving={saving === "personalizedRecommendationsEnabled"}
            onChange={() =>
              updateSetting("personalizedRecommendationsEnabled")
            }
          />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="font-display text-lg font-medium text-ink">
            Analytics & Data
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Manage how your analytics data is collected and analyzed.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <SettingRow
            title="Analytics Collection"
            description="Allow Signal to store analytics snapshots used for trends and reports."
            enabled={settings.analyticsCollectionEnabled}
            saving={saving === "analyticsCollectionEnabled"}
            onChange={() =>
              updateSetting("analyticsCollectionEnabled")
            }
          />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="font-display text-lg font-medium text-ink">
            Danger Zone
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Actions that affect your current session.
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-surface px-5 py-5">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="font-medium text-ink">Sign out</p>
              <p className="mt-1 text-sm text-ink-muted">
                Sign out of your Signal account on this device.
              </p>
            </div>

            <a
              href="/api/auth/signout"
              className="shrink-0 rounded-md border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-background"
            >
              Sign out
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
