import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { publishDraft } from "@/lib/publish-draft";
import { PublishError } from "@/lib/content-publishing";
import { readAuthBody, AuthInputError, PRIVATE_HEADERS } from "@/lib/auth-http";
import { takeAuthQuota } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { draftInclude } from "@/lib/content-drafts";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in before publishing." }, { status: 401, headers: PRIVATE_HEADERS });
  try {
    const body = await readAuthBody(request);
    if (body.confirm !== true || typeof body.accountId !== "string") throw new AuthInputError("Confirm the account before publishing.");
    if (!await takeAuthQuota("publish", session.user.id, 20, 15 * 60000)) throw new AuthInputError("Wait before publishing more posts.", 429);
    const { id } = await params;
    const receipt = await publishDraft(session.user.id, id, body.accountId);
    const draft = await prisma.contentDraft.findFirst({ where: { id, userId: session.user.id }, include: draftInclude });
    return NextResponse.json({ receipt, draft }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    const status = error instanceof AuthInputError ? error.status : error instanceof PublishError ? error.code === "NOT_FOUND" ? 404 : 409 : 503;
    return NextResponse.json({ error: error instanceof AuthInputError || error instanceof PublishError ? error.message : "Delivery could not be confirmed. Refresh the library and check the platform before posting again.", code: error instanceof PublishError ? error.code : undefined }, { status, headers: PRIVATE_HEADERS });
  }
}
