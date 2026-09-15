"use client";
import { useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";
import PasswordInput from "@/components/PasswordInput";
import Button from "@/components/ui/Button";
import { PASSWORD_MIN_LENGTH, passwordError } from "@/lib/auth-policy";
export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (loading) return; setError("");
    const validation = passwordError(password);
    if (validation) { setError(validation); return; }
    if (password !== confirmation) { setError("The new passwords do not match."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, password, confirmPassword: confirmation }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error || "Unable to change your password."); return; }
      await signOut({ callbackUrl: "/login" });
    } catch { setError("Could not reach Signal. Check your connection and try again."); }
    finally { setLoading(false); }
  }
  return <form onSubmit={submit} className="mt-5 grid gap-4" aria-busy={loading}>
    <PasswordInput id="current-password" label="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required />
    <PasswordInput id="settings-new-password" label="New password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={PASSWORD_MIN_LENGTH} required />
    <PasswordInput id="settings-confirm-password" label="Confirm new password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" required />
    <p className="text-sm leading-6 text-ink-muted">Use at least 12 characters. Changing it signs out your existing Signal sessions.</p>
    {error && <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
    <Button type="submit" disabled={loading} className="justify-self-start">{loading ? "Changing password..." : "Change password"}</Button>
  </form>;
}
