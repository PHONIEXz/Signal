import { prisma } from "./prisma.ts";
import { enabled, limit, userLimit, type Service } from "./service-config.ts";
export class UsageError extends Error {
  status: number;
  resetAt?: string;
  constructor(message: string, status = 429, resetAt?: string) { super(message); this.status = status; this.resetAt = resetAt; }
}
export function usageKeys(service: Service, userId: string, now = new Date()) {
  const day = now.toISOString().slice(0,10), month = day.slice(0,7);
  return [`usage:${service}:user:${userId}:${day}`, `usage:${service}:global:${day}`, `usage:${service}:month:${month}`];
}
// Reservations precede external work. Failed attempts count because providers may charge them.
// One transaction prevents concurrent requests exceeding a shared allowance.
export async function reserveUsage(service: Service, userId: string, plan: string, now = new Date()) {
  if (!enabled(service)) throw new UsageError("This feature is temporarily paused. Please try again later.", 503);
  const resetAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1)).toISOString();
  const caps = [userLimit(service, plan), limit(`SIGNAL_${service.toUpperCase()}_GLOBAL_DAILY`, 100), limit(`SIGNAL_${service.toUpperCase()}_GLOBAL_MONTHLY`, 2000)];
  const keys = usageKeys(service, userId, now);
  await prisma.$transaction(async tx => {
    for (let i=0;i<keys.length;i++) {
      const row = await tx.authRateLimit.upsert({ where: { key: keys[i] }, create: { key: keys[i], count: 1, expiresAt: new Date(now.getTime()+35*86400000) }, update: { count: { increment: 1 } } });
      if (row.count > caps[i]) {
        const reset = i === 2 ? new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)).toISOString() : resetAt;
        throw new UsageError(i === 0 ? "You have used today's allowance for this feature." : "Signal's shared allowance for this feature has been reached. Please try again after it resets.",429,reset);
      }
    }
  });
  return { resetAt };
}
export async function recordUsageFailure(service: Service) {
  const key = `usage:${service}:failed:${new Date().toISOString().slice(0,10)}`;
  await prisma.authRateLimit.upsert({where:{key},create:{key,count:1,expiresAt:new Date(Date.now()+35*86400000)},update:{count:{increment:1}}}).catch(()=>{});
}
