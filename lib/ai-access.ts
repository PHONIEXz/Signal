export type AiPreferences = {
  aiInsightsEnabled: boolean;
  personalizedRecommendationsEnabled: boolean;
};

// Every current AI feature analyzes personal account or post data.
export async function withAiPreferences<T>(preferences: AiPreferences | null, run: () => Promise<T>) {
  if (!preferences?.aiInsightsEnabled) {
    return { allowed: false as const, code: "AI_DISABLED", error: "AI insights are turned off. You can enable them in Settings." };
  }
  if (!preferences.personalizedRecommendationsEnabled) {
    return { allowed: false as const, code: "PERSONALIZATION_DISABLED", error: "Personalised analysis is turned off. Enable Personalised Recommendations in Settings to analyse your accounts with AI." };
  }
  return { allowed: true as const, value: await run() };
}
