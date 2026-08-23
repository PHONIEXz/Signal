import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AccountsList from "@/components/dashboard/AccountsList";

export default async function AccountsPage() {
  const session = await auth();

  const connections = session?.user?.id
    ? await prisma.connectedAccount.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <AccountsList connections={connections} />
    </div>
  );
}

