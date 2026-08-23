import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = crypto.randomUUID();
  const redirectUri = `${process.env.APP_URL}/api/connect/facebook/callback`;

  const authorizeUrl = new URL("https://www.facebook.com/v25.0/dialog/oauth");
  authorizeUrl.searchParams.set("client_id", process.env.FACEBOOK_APP_ID!);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set(
    "scope",
    "pages_show_list,pages_read_engagement,read_insights"
  );

  const response = NextResponse.redirect(authorizeUrl.toString());
  response.cookies.set("fb_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}

