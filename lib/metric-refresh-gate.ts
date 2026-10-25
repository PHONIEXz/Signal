import { cache } from "react";
import { prisma } from "./prisma";
import { metricsSchemaReady } from "./metric-storage";
import { enabled, limit, userLimit } from "./service-config";
import { usageKeys } from "./service-usage";
import { buildRefreshGate, type RefreshGate } from "./refresh-gate";

export const getMetricRefreshGate = cache(async (accountId: string): Promise<RefreshGate> => {
  if (!await metricsSchemaReady()) return {reason:"Metrics are temporarily unavailable. Please try again later.",availableAt:null};
  const account = await prisma.connectedAccount.findUnique({where:{id:accountId},select:{userId:true,user:{select:{plan:true,analyticsCollectionEnabled:true}},metricSync:{select:{nextAllowedAt:true}}}});
  if (!account) return {reason:"This account is no longer connected.",availableAt:null};
  const now = new Date();
  const keys = [...usageKeys("metrics",account.userId,now), `metrics:${account.userId}:${now.toISOString().slice(0,10)}`];
  const rows = await prisma.authRateLimit.findMany({where:{key:{in:keys}},select:{key:true,count:true}});
  const counts = new Map(rows.map(row=>[row.key,row.count]));
  const daily = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1));
  const monthly = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1));
  return buildRefreshGate({now,enabled:enabled("metrics"),analyticsEnabled:account.user.analyticsCollectionEnabled,nextAllowedAt:account.metricSync?.nextAllowedAt,
    limits:[
      {count:counts.get(keys[0])??0,cap:userLimit("metrics",account.user.plan),resetAt:daily,reason:"Your daily metrics allowance has been used."},
      {count:counts.get(keys[1])??0,cap:limit("SIGNAL_METRICS_GLOBAL_DAILY",100),resetAt:daily,reason:"SocialPanora's shared daily metrics allowance has been used."},
      {count:counts.get(keys[2])??0,cap:limit("SIGNAL_METRICS_GLOBAL_MONTHLY",2000),resetAt:monthly,reason:"SocialPanora's shared monthly metrics allowance has been used."},
      {count:counts.get(keys[3])??0,cap:account.user.plan==="PRO"?48:12,resetAt:daily,reason:"Your daily collection safety limit has been reached."},
    ]});
});
