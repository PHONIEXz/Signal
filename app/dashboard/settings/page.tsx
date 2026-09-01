import SettingsPanel from "@/components/dashboard/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-muted">
          Preferences
        </p>

        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink">
          Settings
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
          Manage your account and control how Signal AI works with your data.
        </p>
      </div>

      <SettingsPanel />
    </div>
  );
}
