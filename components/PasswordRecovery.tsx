"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PasswordInput from "@/components/PasswordInput";
import { passwordError, PASSWORD_MIN_LENGTH } from "@/lib/auth-policy";

export default function PasswordRecovery({ mode }: { mode: "request" | "reset" }) {
  const token = useRef("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<"link" | "code">("link");
  const [code, setCode] = useState("");
  const [codeStep, setCodeStep] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const feedback = useRef<HTMLDivElement>(null);
  const resetting = mode === "reset" || codeStep;
  const codeMode = method === "code";

  useEffect(() => {
    if (mode !== "reset") return;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const supplied = fragment.get("token");
    // Preserve the in-memory token on StrictMode's second effect invocation.
    if (supplied) token.current = supplied;
    else if (!token.current) setMethod("code");
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [mode]);

  useEffect(() => {
    if (message || error) feedback.current?.focus();
  }, [message, error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    if (resetting) {
      if (codeMode && !/^\d{6}$/.test(code)) { setError("Enter the six-digit code from your latest email."); return; }
      if (!codeMode && !/^[a-f0-9]{64}$/.test(token.current)) {
        setError("This link is missing its reset code. Open the latest email, or request a new link.");
        return;
      }
      const validation = passwordError(password);
      if (validation) { setError(validation); return; }
      if (password !== confirmation) { setError("The passwords do not match."); return; }
    }
    setLoading(true);
    try {
      const response = await fetch(resetting ? "/api/auth/reset-password" : "/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetting
          ? { ...(codeMode ? { email, code } : { token: token.current }), password, confirmPassword: confirmation }
          : { email, method }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "We could not complete that request. Please try again.");
        return;
      }
      if (!resetting && codeMode) { setCodeStep(true); setMessage(""); }
      else setMessage(data.message);
      setPassword("");
      setConfirmation("");
      if (resetting) token.current = "";
      if (resetting) setCode("");
    } catch {
      setError("Could not reach Signal. Check your connection and try again.");
    } finally { setLoading(false); }
  }

  return (
    <AuthShell title={message ? (resetting ? "Password updated" : "Check your inbox") : (resetting ? "Choose a new password" : "Forgot your password?")}
      subtitle={resetting ? "Use a password you do not use anywhere else." : "Enter the email you use to sign in to Signal."}>
      <div ref={feedback} tabIndex={-1} className="outline-none">
        {error && <p role="alert" className="mb-5 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm leading-6 text-red-700 dark:text-red-300">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-connected/30 bg-connected/10 p-4 text-base leading-7 text-ink">{message}</p>}
      </div>
      {!message && (
        <form onSubmit={submit} className="flex flex-col gap-4" aria-busy={loading}>
          {resetting ? <>
            {codeMode && <>
              <p className="text-sm leading-6 text-ink-muted">If your email belongs to a password account, a code will arrive shortly. Check spam. Codes expire in 10 minutes.</p>
              <Input id="code-email" label="Account email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} required />
              <Input id="reset-code" label="Six-digit email code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required />
            </>}
            <PasswordInput id="new-password" label="New password" value={password} onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password" required minLength={PASSWORD_MIN_LENGTH} aria-describedby="password-help" />
            <p id="password-help" className="text-sm leading-6 text-ink-muted">Use at least 12 characters. A few unrelated words make a good passphrase.</p>
            <PasswordInput id="confirm-password" label="Confirm password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password" required />
            <p className="text-sm leading-6 text-ink-muted">Changing your password signs out your existing Signal sessions.</p>
          </> : <>
            <Input id="reset-email" label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} required />
            <fieldset className="flex flex-col gap-2 text-sm text-ink" disabled={loading}>
              <legend className="mb-2 font-semibold">How would you like to reset?</legend>
              <label className="flex items-center gap-2"><input type="radio" name="method" checked={!codeMode} onChange={() => setMethod("link")} />Email a reset link</label>
              <label className="flex items-center gap-2"><input type="radio" name="method" checked={codeMode} onChange={() => setMethod("code")} />Email a six-digit code</label>
            </fieldset>
            <p className="text-sm leading-6 text-ink-muted">Signed up with Google? Continue with Google on the login page.</p>
          </>}
          <Button type="submit" disabled={loading}>{loading ? "Please wait..." : (resetting ? "Save new password" : codeMode ? "Send reset code" : "Send reset link")}</Button>
        </form>
      )}
      {message && !resetting && <p className="mt-4 text-sm leading-6 text-ink-muted">Links expire after 30 minutes. Use the most recent email and check your spam folder. You can request up to three links per hour.</p>}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold text-navy">
        <Link href="/login" className="hover:underline">Back to login</Link>
        {resetting && !message && (codeStep ? <button type="button" disabled={loading} onClick={() => { setCodeStep(false); setCode(""); setError(""); }} className="hover:underline">Request a new code</button> : <Link href="/forgot-password" className="hover:underline">Request new recovery details</Link>)}
        {!resetting && !message && <Link href="/reset-password" className="hover:underline">Already have a code?</Link>}
        {!resetting && message && <button type="button" onClick={() => { setMessage(""); setError(""); }} className="hover:underline">Try another email</button>}
      </div>
    </AuthShell>
  );
}
