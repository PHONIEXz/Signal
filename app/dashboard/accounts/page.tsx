import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { creatorConfigured } from "@/lib/creator-platforms";
import AccountsList from "@/components/dashboard/AccountsList";

const ACCOUNT_MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  instagram: {tone:"success",text:"Instagram professional account connected."},
  youtube: {tone:"success",text:"YouTube channel connected. Open the channel to load official reports."},
  instagram_setup_required: {tone:"error",text:"Instagram needs the administrator’s Meta app configuration."},
  youtube_setup_required: {tone:"error",text:"YouTube needs the administrator’s Google OAuth configuration."},
  instagram_authorization_failed: {tone:"error",text:"Instagram could not be connected. Check professional-account eligibility, approved permissions and try again."},
  youtube_permissions_required: {tone:"error",text:"Approve both YouTube channel access and YouTube Analytics reports to use this connection."},
  youtube_authorization_failed: {tone:"error",text:"YouTube authorization failed or expired. Check app configuration and try again."},
  instagram_select_one_professional_account: {tone:"error",text:"Select one Facebook Page linked to your Instagram professional account during authorization. Additional Pages were returned; reconnect with only that Page."},
  youtube_select_one_channel: {tone:"error",text:"Choose a Google account or Brand Account with exactly one YouTube channel you own."},
  account_identity_mismatch: { tone: "error", text: "This is a different social account. Reconnect the original account to keep its history and draft targets together." },
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
    text: "The Free plan supports one connected account. Unlink the current account or upgrade when paid plans are available.",
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
        creatorReady={{instagram:creatorConfigured("instagram"),youtube:creatorConfigured("youtube")}}
        plan={user?.plan ?? "FREE"}
        connections={connections.map((connection) => ({
          id: connection.id,
          platform: connection.platform,
          displayName: connection.displayName,
          createdAt: connection.createdAt,
          followers: connection.metricSnapshots[0]?.followersCount ?? null,
        }))}
      />
    </div>
  );
}
