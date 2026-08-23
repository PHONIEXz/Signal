import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";

export async function getValidTikTokAccessToken(
  connectedAccountId: string
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
      "TikTok access token expired and no refresh token is available. Reconnect the account."
    );
  }

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: decrypt(account.refreshToken),
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to refresh TikTok access token. Reconnect the account.");
  }

  const data = await res.json();
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

