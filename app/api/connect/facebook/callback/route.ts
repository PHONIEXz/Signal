import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { getAccountConnectionAccess } from "@/lib/account-access";

type FacebookTokenResponse = {
  access_token?: string;
  error?: { message?: string };
};

type FacebookPage = {
  id?: string;
  name?: string;
  access_token?: string;
  tasks?: string[];
};

type FacebookPagesResponse = {
  data?: FacebookPage[];
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

    stage = "managed Page discovery";
    const pagesUrl = new URL("https://graph.facebook.com/v26.0/me/accounts");
    pagesUrl.searchParams.set("fields", "id,name,access_token,tasks");
    pagesUrl.searchParams.set("limit", "100");

    const pagesRes = await fetch(pagesUrl, {
      headers: { Authorization: `Bearer ${longLivedData.access_token}` },
      cache: "no-store",
    });
    const pagesData = (await pagesRes.json()) as FacebookPagesResponse;

    if (!pagesRes.ok) {
      throw new Error(
        pagesData.error?.message ?? "Facebook rejected the Page request"
      );
    }

    const page = pagesData.data?.find(
      (candidate) => candidate.id && candidate.access_token
    );

    if (!page?.id || !page.access_token) {
      console.warn(
        "Facebook connection found no manageable Pages. Check Page full control, business portfolio assignment, and pages_show_list approval."
      );
      return redirect(
        "/dashboard/accounts?error=facebook_no_managed_pages",
        true
      );
    }

    stage = "account storage";
    await prisma.connectedAccount.upsert({
      where: {
        userId_platform: { userId: session.user.id, platform: "facebook" },
      },
      update: {
        accessToken: encrypt(page.access_token),
        platformUserId: page.id,
        displayName: page.name ?? "Facebook Page",
        expiresAt: null,
      },
      create: {
        userId: session.user.id,
        platform: "facebook",
        accessToken: encrypt(page.access_token),
        platformUserId: page.id,
        displayName: page.name ?? "Facebook Page",
      },
    });

    return redirect("/dashboard/accounts?connected=facebook", true);
  } catch (error) {
    console.error(
      `Facebook connection failed during ${stage}:`,
      error instanceof Error ? error.message : "Unknown error"
    );
    return redirect(
      "/dashboard/accounts?error=facebook_connect_failed",
      true
    );
  }
}
