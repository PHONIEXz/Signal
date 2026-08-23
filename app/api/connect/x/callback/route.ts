import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieHeader = request.headers.get("cookie") ?? "";
  const storedVerifier = cookieHeader.match(/x_oauth_verifier=([^;]+)/)?.[1];
  const storedState = cookieHeader.match(/x_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || !storedVerifier || state !== storedState) {
    return NextResponse.redirect(
      new URL("/dashboard?error=x_connect_failed", request.url)
    );
  }

  const redirectUri = `${process.env.APP_URL}/api/connect/x/callback`;
  const basicAuth = Buffer.from(
    `${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: process.env.X_CLIENT_ID!,
      redirect_uri: redirectUri,
      code_verifier: storedVerifier,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/dashboard?error=x_token_failed", request.url)
    );
  }

  const tokenData = await tokenRes.json();
  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await prisma.connectedAccount.upsert({
    where: {
      userId_platform: {
        userId: session.user.id,
        platform: "x",
      },
    },
    update: {
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token
        ? encrypt(tokenData.refresh_token)
        : null,
      expiresAt,
    },
    create: {
      userId: session.user.id,
      platform: "x",
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token
        ? encrypt(tokenData.refresh_token)
        : null,
      expiresAt,
    },
  });

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.delete("x_oauth_verifier");
  response.cookies.delete("x_oauth_state");
  return response;
}

