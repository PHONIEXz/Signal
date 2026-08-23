import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const { tags } = await request.json();

  const post = await prisma.post.findUnique({
    where: { id },
    include: { connectedAccount: true },
  });

  if (!post || post.connectedAccount.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.post.update({
    where: { id },
    data: { tags: typeof tags === "string" ? tags : null },
  });

  return NextResponse.json({ success: true });
}

