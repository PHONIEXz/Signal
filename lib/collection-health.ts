import type { DailyRun } from "./daily-run-store.ts";
const dayMs = 86400000;
export function collectionWindow(now: Date) {
  const day = now.toISOString().slice(0,10);
  const start = new Date(`${day}T06:00:00.000Z`);
  const end = new Date(`${day}T07:00:00.000Z`);
  const overdueAt = new Date(end.getTime() + 15 * 60000);
  return {day, start, end, overdueAt};
}
export function runStatus(run: Pick<DailyRun, "status" | "startedAt">, now: Date) {
  return run.status === "RUNNING" && now.getTime() - Date.parse(run.startedAt) > 6 * 60000 ? "INTERRUPTED" : run.status;
}
export function scheduleHealth(runs: DailyRun[], now: Date) {
  const window = collectionWindow(now);
  const scheduled = runs.filter(run => run.trigger === "scheduler").toSorted((a,b) => Date.parse(b.startedAt)-Date.parse(a.startedAt));
  const today = scheduled.find(run => run.day === window.day);
  const state = today ? runStatus(today, now) : now < window.start ? "NOT_DUE" : now < window.overdueAt ? "WAITING" : "MISSING";
  return { ...window, today, latest: scheduled[0], state };
}
/** Missing observations are gaps, not proof that a provider or scheduler failed. */
export function accountCoverage(dates: Date[], createdAt: Date, enabled: boolean, now: Date) {
  const window = collectionWindow(now);
  const days = new Set(dates.map(date => date.toISOString().slice(0,10)));
  const hasToday = days.has(window.day);
  const state = !enabled ? "PAUSED" : hasToday ? "RECORDED" : now < window.overdueAt ? "WAITING" : "MISSING";
  const completed = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(Date.parse(`${window.day}T00:00:00Z`) - offset * dayMs);
    const candidate = collectionWindow(date);
    if (now >= candidate.overdueAt && createdAt <= candidate.start) completed.push({day:candidate.day, recorded:days.has(candidate.day)});
  }
  return { ...window, state, hasToday, completed, recorded:completed.filter(day => day.recorded).length };
}
