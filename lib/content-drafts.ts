export const FREE_DRAFT_LIMIT = 10;
export const MAX_DRAFT_LENGTH = 5000;

export const PLATFORM_LIMITS: Record<string, number> = {
  x: 280,
  facebook: 63206,
  tiktok: 2200,
};

export function normalizePlan(plan: string) {
  return plan.toUpperCase() === "PRO" ? "PRO" : "FREE";
}

export function draftLimitForPlan(plan: string) {
  return normalizePlan(plan) === "PRO" ? null : FREE_DRAFT_LIMIT;
}
