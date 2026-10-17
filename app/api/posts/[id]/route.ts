import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readAuthBody, AuthInputError } from "@/lib/auth-http";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  let tags: unknown;
  try {
    ({ tags } = await readAuthBody(request));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof AuthInputError ? error.message : "Invalid request",
      },
      { status: error instanceof AuthInputError ? error.status : 400 },
    );
  }
  if (typeof tags !== "string" || tags.length > 500) {
    return NextResponse.json(
      { error: "Tags must be text of at most 500 characters." },
      { status: 400 },
    );
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: { connectedAccount: true },
  });

  if (!post || post.connectedAccount.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.post.update({
    where: { id },
    data: { tags: tags.trim() || null },
  });

  return NextResponse.json({ success: true });
}
