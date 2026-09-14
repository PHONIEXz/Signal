"use client";
import Button from "@/components/ui/Button";

export default function DashboardError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div role="alert" className="surface-card mx-auto max-w-lg p-8">
      <h2 className="font-display text-2xl font-semibold">We could not load this view</h2>
      <p className="my-4 text-base leading-7 text-ink-muted">Try again in a moment. If the problem continues, return to your accounts to check the connection.</p>
      <Button onClick={retry}>Try again</Button>
      <a href="/dashboard/accounts" className="mt-4 block text-center text-sm font-semibold text-navy hover:underline">Go to accounts</a>
    </div>
  );
}
