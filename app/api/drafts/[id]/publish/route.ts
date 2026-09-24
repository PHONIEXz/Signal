import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { publishDraft } from "@/lib/publish-draft";
import { PublishError } from "@/lib/content-publishing";
import { readAuthBody, requestOrigin, AuthInputError, PRIVATE_HEADERS } from "@/lib/auth-http";
import { takeAuthQuota } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";
import { draftInclude } from "@/lib/content-drafts";
import { publishingSchemaReady } from "@/lib/studio-data";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in before publishing." }, { status: 401, headers: PRIVATE_HEADERS });
  try {
    if (!(await publishingSchemaReady())) return NextResponse.json({ error: "Content Studio needs its publishing database upgrade.", code: "STUDIO_SCHEMA_PENDING" }, { status: 503, headers: PRIVATE_HEADERS });
    const body = await readAuthBody(request, 4096, requestOrigin(request));
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
