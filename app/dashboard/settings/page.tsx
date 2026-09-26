import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import SettingsPanel, { type Settings } from "@/components/dashboard/SettingsPanel";
import PageIntro from "@/components/dashboard/PageIntro";

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
      <div className="mb-8">
        <PageIntro eyebrow="Workspace / Preferences" title="Settings" description="Choose how Signal uses your data, manage your account, and keep your workspace comfortable." aside={<p className="text-xs font-semibold text-connected">● Preferences save automatically</p>} />
      </div>
      <SettingsPanel initialSettings={initialSettings} />
    </div>
  );
}
