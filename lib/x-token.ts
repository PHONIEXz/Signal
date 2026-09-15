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
    throw new Error(
      "X access token expired and no refresh token is available. Reconnect the account."
    );
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

  if (!res.ok) {
    throw new Error("Failed to refresh X access token. Reconnect the account.");
  }

  const data = await res.json();
  if (typeof data.access_token !== "string" || !data.access_token) throw new Error("Invalid X token refresh response. Reconnect the account.");
  const newExpiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : null;

  await prisma.connectedAccount.update({
    where: { id: connectedAccountId },
    data: {
      accessToken: encrypt(data.access_token),
      refreshToken: data.refresh_token
        ? encrypt(data.refresh_token)
        : account.refreshToken,
      expiresAt: newExpiresAt,
    },
  });

  return data.access_token;
}

