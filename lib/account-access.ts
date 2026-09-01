import { prisma } from "@/lib/prisma";

export const FREE_CONNECTED_ACCOUNT_LIMIT = 1;
export const PRO_PLAN = "PRO";

export type AccountConnectionAccess = {
  allowed: boolean;
  plan: string;
  limit: number | null;
  connectedCount: number;
  alreadyConnected: boolean;
};

export async function getAccountConnectionAccess(
  userId: string,
  platform: string
): Promise<AccountConnectionAccess> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      connectedAccounts: {
        where: { platform },
        select: { id: true },
        take: 1,
      },
      _count: {
        select: {
          connectedAccounts: true,
        },
      },
    },
  });

  if (!user) {
    return {
      allowed: false,
      plan: "FREE",
      limit: FREE_CONNECTED_ACCOUNT_LIMIT,
      connectedCount: 0,
      alreadyConnected: false,
    };
  }

  const plan = user.plan.toUpperCase();
  const alreadyConnected = user.connectedAccounts.length > 0;
  const connectedCount = user._count.connectedAccounts;
  const limit = plan === PRO_PLAN ? null : FREE_CONNECTED_ACCOUNT_LIMIT;

  return {
    allowed:
      alreadyConnected ||
      limit === null ||
      connectedCount < FREE_CONNECTED_ACCOUNT_LIMIT,
    plan,
    limit,
    connectedCount,
    alreadyConnected,
  };
}
