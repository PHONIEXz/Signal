import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuthInputError, PRIVATE_HEADERS, readAuthBody, requestOrigin } from "@/lib/auth-http";

export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await readAuthBody(request, 1024, requestOrigin(request));

    const deleted = await prisma.connectedAccount.deleteMany({
      where: {
        userId: session.user.id,
        platform: "facebook",
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Facebook account is not connected" },
        { status: 404 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Facebook connection and its saved data deleted from Signal",
    }, { headers: PRIVATE_HEADERS });
    response.cookies.set("fb_page_selection", "", { maxAge: 0, path: "/", httpOnly: true, sameSite: "lax" });
    response.cookies.set("fb_oauth_state", "", { maxAge: 0, path: "/", httpOnly: true, sameSite: "lax" });
    return response;
  } catch (error) {
    if (error instanceof AuthInputError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: PRIVATE_HEADERS });
    }
    console.error("Facebook unlink failed", { event: "FACEBOOK_UNLINK_FAILED" });

    return NextResponse.json(
      { error: "Failed to unlink Facebook account" },
      { status: 500 }
    );
  }
}
