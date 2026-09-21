import { prisma } from "./prisma.ts";
import { sameConnectionIdentity } from "./connection-identity.ts";
export class ConnectionIdentityError extends Error {}
export async function saveConnection(userId: string, platform: string, data: { platformUserId: string; accessToken: string; refreshToken?: string | null; displayName?: string; expiresAt: Date | null }) {
  if (!data.platformUserId || !data.accessToken) throw new Error("Invalid connection");
  return prisma.$transaction(async tx => {
    const existing = await tx.connectedAccount.findUnique({where:{userId_platform:{userId,platform}},include:{_count:{select:{posts:true,metricSnapshots:true,draftTargets:true,publications:true,pageInsights:true}}}});
    if(existing && !sameConnectionIdentity(existing.platformUserId,data.platformUserId,Object.values(existing._count).some(count=>count>0))) throw new ConnectionIdentityError("Different account");
    return tx.connectedAccount.upsert({where:{userId_platform:{userId,platform}},create:{userId,platform,...data},update:data});
  });
}
