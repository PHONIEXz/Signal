import SettingsPanel from "@/components/dashboard/SettingsPanel";
import Link from "next/link";

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
      <section className="surface-card mt-6 p-6" aria-labelledby="security-title">
        <h2 id="security-title" className="font-display text-xl font-semibold">Password and security</h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">Reset your password by email. If you sign in only with Google, manage your password in your Google account.</p>
        <Link href="/forgot-password" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold text-navy hover:bg-paper">Reset password</Link>
      </section>
    </div>
  );
}
