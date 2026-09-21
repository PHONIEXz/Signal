export function sameConnectionIdentity(stored: string | null, incoming: string, hasHistory: boolean) {
  return !!incoming && (stored === incoming || (!stored && !hasHistory));
}
