import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { getAccountConnectionAccess } from "@/lib/account-access";

export async function GET(request: NextRequest) {
  const appUrl = process.env.APP_URL?.replace(/\/+$/, "");
  const facebookAppId = process.env.FACEBOOK_APP_ID;
  const facebookAppSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appUrl || !facebookAppId || !facebookAppSecret) {
    return NextResponse.json(
      {
        error:
          "Missing APP_URL, FACEBOOK_APP_ID, or FACEBOOK_APP_SECRET",
      },
      { status: 500 }
    );
  }

  function redirect(path: string, clearState = false) {
    const response = NextResponse.redirect(new URL(path, appUrl));

    if (clearState) {
      response.cookies.delete("fb_oauth_state");
    }

    return response;
  }

  const session = await auth();

  if (!session?.user?.id) {
    return redirect("/login", true);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get("fb_oauth_state")?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return redirect(
      "/dashboard/accounts?error=facebook_connect_failed",
      true
    );
  }

  const connectionAccess = await getAccountConnectionAccess(
    session.user.id,
    "facebook"
  );

  if (!connectionAccess.allowed) {
    return redirect(
      "/dashboard/accounts?error=free_account_limit",
      true
    );
  }

  const redirectUri = `${appUrl}/api/connect/facebook/callback`;

  try {
    const shortLivedUrl = new URL(
      "https://graph.facebook.com/v25.0/oauth/access_token"
    );

    shortLivedUrl.searchParams.set("client_id", facebookAppId);
    shortLivedUrl.searchParams.set(
      "client_secret",
      facebookAppSecret
    );
    shortLivedUrl.searchParams.set("redirect_uri", redirectUri);
    shortLivedUrl.searchParams.set("code", code);

    const shortLivedRes = await fetch(shortLivedUrl, {
      cache: "no-store",
    });
    const shortLivedData = await shortLivedRes.json();

    if (!shortLivedRes.ok || !shortLivedData.access_token) {
      throw new Error(
        shortLivedData?.error?.message ??
          "Failed to exchange Facebook authorization code"
      );
    }

    const longLivedUrl = new URL(
      "https://graph.facebook.com/v25.0/oauth/access_token"
    );

    longLivedUrl.searchParams.set(
      "grant_type",
      "fb_exchange_token"
    );
    longLivedUrl.searchParams.set("client_id", facebookAppId);
    longLivedUrl.searchParams.set(
      "client_secret",
      facebookAppSecret
    );
    longLivedUrl.searchParams.set(
      "fb_exchange_token",
      shortLivedData.access_token
    );

    const longLivedRes = await fetch(longLivedUrl, {
      cache: "no-store",
    });
    const longLivedData = await longLivedRes.json();

    if (!longLivedRes.ok || !longLivedData.access_token) {
      throw new Error(
        longLivedData?.error?.message ??
          "Failed to obtain a long-lived Facebook token"
      );
    }

    const pagesUrl = new URL(
      "https://graph.facebook.com/v25.0/me/accounts"
    );
    pagesUrl.searchParams.set("fields", "id,name,access_token");

    const pagesRes = await fetch(pagesUrl, {
      headers: {
        Authorization: `Bearer ${longLivedData.access_token}`,
      },
      cache: "no-store",
    });
    const pagesData = await pagesRes.json();

    if (!pagesRes.ok) {
      throw new Error(
        pagesData?.error?.message ?? "Failed to fetch Facebook Pages"
      );
    }

    const page = pagesData.data?.[0];

    if (!page?.id || !page?.access_token) {
      return redirect(
        "/dashboard/accounts?error=no_facebook_page",
        true
      );
    }

    await prisma.connectedAccount.upsert({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: "facebook",
        },
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

    return redirect("/dashboard", true);
  } catch (error) {
    console.error(
      "Facebook connection failed:",
      error instanceof Error ? error.message : error
    );

    return redirect(
      "/dashboard/accounts?error=facebook_connect_failed",
      true
    );
  }
}
