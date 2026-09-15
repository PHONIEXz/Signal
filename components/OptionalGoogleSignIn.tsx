"use client";
import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import Button from "@/components/ui/Button";
export default function OptionalGoogleSignIn() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    getProviders().then((providers) => { if (active) setAvailable(Boolean(providers?.google)); }).catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, []);
  if (!available) return null;
  return <>
    <div className="my-6 flex items-center gap-3"><div className="h-px flex-1 bg-border" /><span className="text-xs text-ink-muted">or</span><div className="h-px flex-1 bg-border" /></div>
    <Button type="button" variant="secondary" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>Continue with Google</Button>
  </>;
}
