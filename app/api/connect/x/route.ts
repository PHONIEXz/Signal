import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const deleted = await prisma.connectedAccount.deleteMany({
      where: {
        userId: session.user.id,
        platform: "x",
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "X account is not connected" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "X account unlinked successfully",
    });
  } catch (error) {
    console.error("X unlink error:", error);

    return NextResponse.json(
      { error: "Failed to unlink X account" },
      { status: 500 }
    );
  }
}
