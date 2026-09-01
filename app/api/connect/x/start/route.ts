import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { getAccountConnectionAccess } from "@/lib/account-access";
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/pkce";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const connectionAccess = await getAccountConnectionAccess(
    session.user.id,
    "x"
  );

  if (!connectionAccess.allowed) {
    return NextResponse.redirect(
      new URL("/dashboard/accounts?error=free_account_limit", request.url)
    );
  }

  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = crypto.randomUUID();

  const redirectUri = `${process.env.APP_URL}/api/connect/x/callback`;

  const authorizeUrl = new URL("https://x.com/i/oauth2/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", process.env.X_CLIENT_ID!);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "tweet.read users.read offline.access");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authorizeUrl.toString());
  response.cookies.set("x_oauth_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("x_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return response;
}

