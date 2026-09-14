import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { getAccountConnectionAccess } from "@/lib/account-access";

export async function GET() {
  const appUrl = process.env.APP_URL?.replace(/\/+$/, "");
  const facebookAppId = process.env.FACEBOOK_APP_ID;
  const facebookConfigId = process.env.FACEBOOK_CONFIG_ID;

  if (!appUrl || !facebookAppId || !facebookConfigId) {
    return NextResponse.json(
      {
        error:
          "Missing APP_URL, FACEBOOK_APP_ID, or FACEBOOK_CONFIG_ID",
      },
      { status: 500 }
    );
  }

  const session = await auth();

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const connectionAccess = await getAccountConnectionAccess(
    session.user.id,
    "facebook"
  );

  if (!connectionAccess.allowed) {
    return NextResponse.redirect(
      new URL(
        "/dashboard/accounts?error=free_account_limit",
        appUrl
      )
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = `${appUrl}/api/connect/facebook/callback`;

  const authorizeUrl = new URL(
    "https://www.facebook.com/v25.0/dialog/oauth"
  );

  authorizeUrl.searchParams.set("client_id", facebookAppId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("config_id", facebookConfigId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set(
    "override_default_response_type",
    "true"
  );

  const response = NextResponse.redirect(authorizeUrl);

  response.cookies.set("fb_oauth_state", state, {
    httpOnly: true,
    secure: appUrl.startsWith("https://"),
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
