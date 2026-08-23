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
  const storedState = cookieHeader.match(/fb_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(
      new URL("/dashboard/accounts?error=facebook_connect_failed", request.url)
    );
  }

  const redirectUri = `${process.env.APP_URL}/api/connect/facebook/callback`;

  try {
    // Step 1: exchange the code for a short-lived user access token
    const shortLivedRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`
    );
    if (!shortLivedRes.ok) throw new Error("Failed to exchange code for a token");
    const shortLivedData = await shortLivedRes.json();

    // Step 2: exchange for a long-lived user access token (~60 days)
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${shortLivedData.access_token}`
    );
    if (!longLivedRes.ok) throw new Error("Failed to get a long-lived token");
    const longLivedData = await longLivedRes.json();

    // Step 3: get the Pages this user manages, with a Page-specific access token for each
    const pagesRes = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?access_token=${longLivedData.access_token}`
    );
    if (!pagesRes.ok) throw new Error("Failed to fetch Pages");
    const pagesData = await pagesRes.json();

    const page = pagesData.data?.[0];
    if (!page) {
      return NextResponse.redirect(
        new URL("/dashboard/accounts?error=no_facebook_page", request.url)
      );
    }

    // Page tokens derived from a long-lived user token don't expire under normal use
    await prisma.connectedAccount.upsert({
      where: {
        userId_platform: { userId: session.user.id, platform: "facebook" },
      },
      update: {
        accessToken: encrypt(page.access_token),
        platformUserId: page.id,
        expiresAt: null,
      },
      create: {
        userId: session.user.id,
        platform: "facebook",
        accessToken: encrypt(page.access_token),
        platformUserId: page.id,
      },
    });

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.delete("fb_oauth_state");
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/accounts?error=facebook_connect_failed", request.url)
    );
  }
}

