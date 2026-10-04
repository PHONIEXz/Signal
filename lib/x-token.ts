import { MetricTokenError, tokenRefreshFailure, refreshedToken } from "./metric-diagnostics.ts";
import { prisma } from "./prisma.ts";
import { encrypt, decrypt } from "./encryption.ts";

export async function getValidXAccessToken(
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
    throw new MetricTokenError({code:"METRIC_RECONNECT",responsibility:"connection",message:"X authorization expired without a renewal token. Reconnect this account.",stopAccountRequests:true});
  }

  if (!process.env.X_CLIENT_ID?.trim() || !process.env.X_CLIENT_SECRET?.trim()) {
    throw new MetricTokenError({ code: "METRIC_CONFIGURATION", responsibility: "signal", message: "Signal's X renewal configuration is missing. The server configuration needs review; saved metrics are preserved.", stopAccountRequests: true });
  }

  const basicAuth = Buffer.from(
    `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
  ).toString("base64");

  const res = await request("https://api.x.com/2/oauth2/token", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decrypt(account.refreshToken),
      client_id: process.env.X_CLIENT_ID!,
    }),
  });

  const data = await res.json().catch(() => null);
  const failure=tokenRefreshFailure("x",res.status,data);
  if (failure) throw new MetricTokenError(failure);
  // OAuth invalid_grant is a connection failure, even when the endpoint uses 400.
  if (data?.error) throw new MetricTokenError({code:"METRIC_RECONNECT",responsibility:"connection",message:"Reconnect X: the saved authorization could not be renewed.",stopAccountRequests:true});
  const refreshed=refreshedToken("x",data);

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

