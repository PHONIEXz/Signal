import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AccountsList from "@/components/dashboard/AccountsList";

export default async function AccountsPage() {
  const session = await auth();

  const connections = session?.user?.id
    ? await prisma.connectedAccount.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        include: {
          metricSnapshots: {
            orderBy: { fetchedAt: "desc" },
            take: 1,
          },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <AccountsList
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
