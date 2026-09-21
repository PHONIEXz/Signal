import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { encrypt } from "@/lib/encryption";
import { getAccountConnectionAccess } from "@/lib/account-access";

type FacebookTokenResponse = {
  access_token?: string;
  error?: { message?: string };
};

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL?.replace(/\/+$/, "");
  const facebookAppId = process.env.FACEBOOK_APP_ID;
  const facebookAppSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appUrl || !facebookAppId || !facebookAppSecret) {
    return NextResponse.json(
      { error: "Facebook connection is not configured" },
      { status: 500 }
    );
  }

  function redirect(path: string, clearState = false) {
    const response = NextResponse.redirect(new URL(path, appUrl));
    if (clearState) response.cookies.delete("fb_oauth_state");
    return response;
  }

  const session = await auth();
  if (!session?.user?.id) {
    return redirect("/login", true);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const storedState = request.cookies.get("fb_oauth_state")?.value;

  if (oauthError) {
    return redirect(
      "/dashboard/accounts?error=facebook_authorization_denied",
      true
    );
  }

  if (!code || !state || !storedState || state !== storedState) {
    return redirect(
      "/dashboard/accounts?error=facebook_state_mismatch",
      true
    );
  }

  const connectionAccess = await getAccountConnectionAccess(
    session.user.id,
    "facebook"
  );

  if (!connectionAccess.allowed) {
    return redirect("/dashboard/accounts?error=free_account_limit", true);
  }

  const redirectUri = `${appUrl}/api/connect/facebook/callback`;
  let stage = "authorization-code exchange";

  try {
    const shortLivedUrl = new URL(
      "https://graph.facebook.com/v26.0/oauth/access_token"
    );
    shortLivedUrl.searchParams.set("client_id", facebookAppId);
    shortLivedUrl.searchParams.set("client_secret", facebookAppSecret);
    shortLivedUrl.searchParams.set("redirect_uri", redirectUri);
    shortLivedUrl.searchParams.set("code", code);

    const shortLivedRes = await fetch(shortLivedUrl, { cache: "no-store" });
    const shortLivedData = (await shortLivedRes.json()) as FacebookTokenResponse;

    if (!shortLivedRes.ok || !shortLivedData.access_token) {
      throw new Error(
        shortLivedData.error?.message ?? "Facebook rejected the authorization code"
      );
    }

    stage = "long-lived token exchange";
    const longLivedUrl = new URL(
      "https://graph.facebook.com/v26.0/oauth/access_token"
    );
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", facebookAppId);
    longLivedUrl.searchParams.set("client_secret", facebookAppSecret);
    longLivedUrl.searchParams.set(
      "fb_exchange_token",
      shortLivedData.access_token
    );

    const longLivedRes = await fetch(longLivedUrl, { cache: "no-store" });
    const longLivedData = (await longLivedRes.json()) as FacebookTokenResponse;

    if (!longLivedRes.ok || !longLivedData.access_token) {
      throw new Error(
        longLivedData.error?.message ?? "Facebook rejected the token exchange"
      );
    }

    const response = redirect("/dashboard/accounts/facebook/select", true);
    const pending = encrypt(JSON.stringify({userId:session.user.id,token:longLivedData.access_token,expiresAt:Date.now()+600000}));
    if (pending.length > 3500) throw new Error("Selection token too large");
    response.cookies.set("fb_page_selection", pending, {httpOnly:true,secure:appUrl.startsWith("https://"),sameSite:"lax",path:"/",maxAge:600});
    return response;
  } catch {
    console.error(
      `Facebook connection failed during ${stage}:`,
      "Provider request failed"
    );
    return redirect(
      "/dashboard/accounts?error=facebook_connect_failed",
      true
    );
  }
}
