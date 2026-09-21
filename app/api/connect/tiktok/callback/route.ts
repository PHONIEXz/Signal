import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveConnection, ConnectionIdentityError } from "@/lib/save-connection";
import { encrypt } from "@/lib/encryption";
import { getAccountConnectionAccess } from "@/lib/account-access";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieHeader = request.headers.get("cookie") ?? "";
  const storedState = cookieHeader.match(/tiktok_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(
      new URL("/dashboard/accounts?error=tiktok_connect_failed", request.url)
    );
  }

  const connectionAccess = await getAccountConnectionAccess(
    session.user.id,
    "tiktok"
  );

  if (!connectionAccess.allowed) {
    const response = NextResponse.redirect(
      new URL("/dashboard/accounts?error=free_account_limit", request.url)
    );
    response.cookies.delete("tiktok_oauth_state");
    return response;
  }

  const redirectUri = `${process.env.APP_URL}/api/connect/tiktok/callback`;

  try {
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) throw new Error("Failed to exchange code for a token");
    const tokenData = await tokenRes.json();

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    await saveConnection(session.user.id, "tiktok", {
      platformUserId: tokenData.open_id,
      accessToken: encrypt(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
      expiresAt,
    });

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.delete("tiktok_oauth_state");
    return response;
  } catch (error) {
    if (error instanceof ConnectionIdentityError) return NextResponse.redirect(new URL("/dashboard/accounts?error=account_identity_mismatch", request.url));
    return NextResponse.redirect(
      new URL("/dashboard/accounts?error=tiktok_connect_failed", request.url)
    );
  }
}

