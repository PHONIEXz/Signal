import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AccountsList from "@/components/dashboard/AccountsList";

export default async function AccountsPage() {
  const session = await auth();

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          plan: true,
          connectedAccounts: {
            orderBy: { createdAt: "asc" },
            include: {
              metricSnapshots: {
                orderBy: { fetchedAt: "desc" },
                take: 1,
              },
            },
          },
        },
      })
    : null;

  const connections = user?.connectedAccounts ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <AccountsList
        plan={user?.plan ?? "FREE"}
        connections={connections.map((connection) => ({
          id: connection.id,
          platform: connection.platform,
          createdAt: connection.createdAt,
          followers: connection.metricSnapshots[0]?.followersCount ?? null,
        }))}
      />
    </div>
  );
}
