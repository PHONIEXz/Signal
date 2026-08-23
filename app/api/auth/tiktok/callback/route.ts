import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = req.cookies.get("tiktok_oauth_state")?.value;

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(
      new URL("/dashboard/accounts?error=tiktok_auth_failed", req.url)
    );
  }

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    console.error("TikTok token exchange failed:", tokenData);
    return NextResponse.redirect(
      new URL("/dashboard/accounts?error=tiktok_token_failed", req.url)
    );
  }

  // TODO: save tokenData (access_token, refresh_token, open_id, expires_in) to your DB

  const res = NextResponse.redirect(
    new URL("/dashboard/accounts?connected=tiktok", req.url)
  );
  res.cookies.delete("tiktok_oauth_state");
  return res;
}
