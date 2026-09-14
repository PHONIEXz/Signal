import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AccountsList from "@/components/dashboard/AccountsList";

const ACCOUNT_MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  facebook: {
    tone: "success",
    text: "Facebook Page connected successfully.",
  },
  facebook_authorization_denied: {
    tone: "error",
    text: "Facebook authorization was cancelled. Try again and approve the requested Page access.",
  },
  facebook_state_mismatch: {
    tone: "error",
    text: "The Facebook connection expired or could not be verified. Start the connection again.",
  },
  facebook_no_managed_pages: {
    tone: "error",
    text: "Facebook did not return a manageable Page. Confirm that your profile has full control of the Page and that the Page is assigned to the selected business portfolio.",
  },
  facebook_connect_failed: {
    tone: "error",
    text: "Facebook could not be connected. Check the Meta configuration and try again.",
  },
  free_account_limit: {
    tone: "error",
    text: "The Free plan supports one connected account. Unlink the current account or use a Pro developer account.",
  },
};

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const query = await searchParams;
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
  const messageKey = query.error ?? query.connected;
  const message = messageKey ? ACCOUNT_MESSAGES[messageKey] : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {message && (
        <div
          role={message.tone === "error" ? "alert" : "status"}
          className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
            message.tone === "success"
              ? "border-connected/25 bg-connected/10 text-connected"
              : "border-red-500/25 bg-red-500/[0.08] text-red-600 dark:text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}
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
