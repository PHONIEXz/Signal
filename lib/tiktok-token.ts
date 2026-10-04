import { MetricTokenError, tokenRefreshFailure, refreshedToken } from "./metric-diagnostics.ts";
import { prisma } from "./prisma.ts";
import { encrypt, decrypt } from "./encryption.ts";

export async function getValidTikTokAccessToken(
  connectedAccountId: string,
  request: typeof fetch = fetch
): Promise<string> {
  const account = await prisma.connectedAccount.findUniqueOrThrow({
    where: { id: connectedAccountId },
  });

  const isExpired = account.expiresAt
    ? account.expiresAt.getTime() < Date.now() + 60_000
    : false;

  if (!isExpired) {
    return decrypt(account.accessToken);
  }

  if (!account.refreshToken) {
    throw new MetricTokenError({code:"METRIC_RECONNECT",responsibility:"connection",message:"TikTok authorization expired without a renewal token. Reconnect this account.",stopAccountRequests:true});
  }

  if (!process.env.TIKTOK_CLIENT_KEY?.trim() || !process.env.TIKTOK_CLIENT_SECRET?.trim()) {
    throw new MetricTokenError({ code: "METRIC_CONFIGURATION", responsibility: "signal", message: "Signal's TikTok renewal configuration is missing. The server configuration needs review; saved metrics are preserved.", stopAccountRequests: true });
  }

  const res = await request("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: decrypt(account.refreshToken),
    }),
  });

  const data = await res.json().catch(() => null);
  const failure=tokenRefreshFailure("tiktok",res.status,data);
  if (failure) throw new MetricTokenError(failure);
  // OAuth invalid_grant is a connection failure, even when the endpoint uses 400.
  if (data?.error) throw new MetricTokenError({code:"METRIC_RECONNECT",responsibility:"connection",message:"Reconnect TikTok: the saved authorization could not be renewed.",stopAccountRequests:true});
  const refreshed=refreshedToken("tiktok",data);

  await prisma.connectedAccount.update({
    where: { id: connectedAccountId },
    data: {
      accessToken: encrypt(refreshed.accessToken),
      refreshToken: refreshed.refreshToken
        ? encrypt(refreshed.refreshToken)
        : account.refreshToken,
      expiresAt: refreshed.expiresAt,
    },
  });

  return refreshed.accessToken;
}

