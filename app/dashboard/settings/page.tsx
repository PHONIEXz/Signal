import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import SettingsPanel, { type Settings } from "@/components/dashboard/SettingsPanel";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      hashedPassword: true,
      aiInsightsEnabled: true,
      personalizedRecommendationsEnabled: true,
      analyticsCollectionEnabled: true,
    },
  });
  const initialSettings: Settings | null = user ? {
    name: user.name,
    email: user.email,
    hasPassword: Boolean(user.hashedPassword),
    aiInsightsEnabled: user.aiInsightsEnabled,
    personalizedRecommendationsEnabled: user.personalizedRecommendationsEnabled,
    analyticsCollectionEnabled: user.analyticsCollectionEnabled,
  } : null;
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-navy">Your workspace / Preferences</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.045em] text-ink">Settings</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
            Choose how Signal uses your data, manage your account, and keep your workspace comfortable.
          </p>
        </div>
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-connected/25 bg-connected/10 px-3 py-2 text-xs font-semibold text-connected">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-connected" />
          Preferences save automatically
        </p>
      </div>
      <SettingsPanel initialSettings={initialSettings} />
    </div>
  );
}
