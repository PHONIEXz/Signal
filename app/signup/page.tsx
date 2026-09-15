"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import OptionalGoogleSignIn from "@/components/OptionalGoogleSignIn";
import { signIn } from "next-auth/react";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import PasswordInput from "@/components/PasswordInput";
import { passwordError, PASSWORD_MIN_LENGTH } from "@/lib/auth-policy";

export default function SignupPage() {
  const [name, setName] = useState("");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validation = passwordError(password);
    if (validation) { setError(validation); return; }
    setLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoading(false);
        setError(data.error || "Something went wrong.");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      setLoading(false);

      if (!result || !result.ok || result.error) {
        router.replace("/login");
        router.refresh();
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Could not complete signup. Please try again or sign in if the account was created.");
    } finally { setLoading(false); }
  }

  return (
    <AuthShell
      title="Create an account"
      subtitle="Connect your platforms once, track them from one place."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="name"
          label="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          required
        />
        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <PasswordInput
          id="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          aria-describedby="signup-password-help"
          required
        />
        <p id="signup-password-help" className="text-sm text-ink-muted">Use at least 12 characters. Try a few unrelated words.</p>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-2">
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <OptionalGoogleSignIn />

      <p className="mt-6 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-navy hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
