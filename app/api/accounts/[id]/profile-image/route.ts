import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";
import { getValidTikTokAccessToken } from "@/lib/tiktok-token";
import { getValidXAccessToken } from "@/lib/x-token";
import { profileImageUrl } from "@/lib/platform-data";

type RouteContext = { params: Promise<{ id: string }> };

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse(null, { status: 401, headers: NO_STORE_HEADERS });
  }

  const { id } = await params;
  const account = await prisma.connectedAccount.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!account) {
    return new NextResponse(null, { status: 404, headers: NO_STORE_HEADERS });
  }

  try {
    let payload: unknown;

    if (account.platform === "facebook" && account.platformUserId) {
      const accessToken = decrypt(account.accessToken);
      const url = new URL(
        `https://graph.facebook.com/v26.0/${account.platformUserId}/picture`
      );
      url.searchParams.set("type", "large");
      url.searchParams.set("redirect", "false");

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Facebook profile image unavailable");
      payload = await response.json();
    } else if (account.platform === "x") {
      const accessToken = await getValidXAccessToken(account.id);
      const response = await fetch(
        "https://api.x.com/2/users/me?user.fields=profile_image_url",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }
      );
      if (!response.ok) throw new Error("X profile image unavailable");
      payload = await response.json();
    } else if (account.platform === "tiktok") {
      const accessToken = await getValidTikTokAccessToken(account.id);
      const response = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=avatar_url",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }
      );
      if (!response.ok) throw new Error("TikTok profile image unavailable");
      payload = await response.json();
    } else {
      return new NextResponse(null, { status: 404, headers: NO_STORE_HEADERS });
    }

    const imageUrl = profileImageUrl(account.platform, payload);
    if (!imageUrl) {
      return new NextResponse(null, { status: 404, headers: NO_STORE_HEADERS });
    }

    const response = NextResponse.redirect(imageUrl, 307);
    response.headers.set("Cache-Control", "private, max-age=3600");
    return response;
  } catch {
    return new NextResponse(null, { status: 404, headers: NO_STORE_HEADERS });
  }
}
