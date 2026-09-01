import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { getAccountConnectionAccess } from "@/lib/account-access";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const connectionAccess = await getAccountConnectionAccess(
    session.user.id,
    "tiktok"
  );

  if (!connectionAccess.allowed) {
    return NextResponse.redirect(
      new URL("/dashboard/accounts?error=free_account_limit", request.url)
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = `${process.env.APP_URL}/api/connect/tiktok/callback`;

  const authorizeUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
  authorizeUrl.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY!);
  authorizeUrl.searchParams.set(
    "scope",
    "user.info.basic,user.info.stats,video.list"
  );
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl.toString());
  response.cookies.set("tiktok_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}

