import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LOCKED_DELIVERIES } from "@/lib/content-publishing";
import { updateDraft } from "@/lib/draft-editing";
import { readAuthBody, AuthInputError } from "@/lib/auth-http";
import { validMediaUrl, MAX_DRAFT_LENGTH, normalizePlan } from "@/lib/content-drafts";

type RouteContext = { params: Promise<{ id: string }> };

function parseScheduledFor(value: unknown) {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.contentDraft.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await readAuthBody(request, 32768);
  } catch (error) {
    return NextResponse.json({ error: error instanceof AuthInputError ? error.message : "Invalid request" }, { status: error instanceof AuthInputError ? error.status : 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl.trim() : "";
  const targetIds = Array.isArray(body.targetIds)
    ? [...new Set(body.targetIds.filter((targetId): targetId is string => typeof targetId === "string"))]
    : [];
  const scheduledFor = parseScheduledFor(body.scheduledFor);
  const expectedUpdatedAt = typeof body.expectedUpdatedAt === "string" ? new Date(body.expectedUpdatedAt) : null;
  if (!expectedUpdatedAt || Number.isNaN(expectedUpdatedAt.getTime())) {
    return NextResponse.json({ error: "Reload this draft before updating it.", code: "DRAFT_VERSION_REQUIRED" }, { status: 428 });
  }

  if (!text || text.length > MAX_DRAFT_LENGTH) {
    return NextResponse.json(
      { error: `Content must contain between 1 and ${MAX_DRAFT_LENGTH} characters.` },
      { status: 400 }
    );
  }
  if (!targetIds.length || scheduledFor === undefined) {
    return NextResponse.json({ error: "Choose an account and provide a valid date." }, { status: 400 });
  }
  if (!validMediaUrl(mediaUrl)) {
    return NextResponse.json({ error: "Use a public HTTP or HTTPS media link." }, { status: 400 });
  }

  const [user, ownedTargets] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } }),
    prisma.connectedAccount.findMany({
      where: { id: { in: targetIds }, userId: session.user.id },
      select: { id: true },
    }),
  ]);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (ownedTargets.length !== targetIds.length) {
    return NextResponse.json({ error: "One or more selected accounts are unavailable." }, { status: 400 });
  }
  if (normalizePlan(user.plan) !== "PRO" && targetIds.length > 1) {
    return NextResponse.json({ error: "Multi-platform drafts are available on Pro." }, { status: 403 });
  }

  const draft = await updateDraft(session.user.id, id, { text, mediaUrl, targetIds, scheduledFor, expectedUpdatedAt });
  if (draft === "MISSING") return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  if (draft === "LOCKED") return NextResponse.json({ error: "This draft has delivery history. Use a new copy to preserve the original post." }, { status: 409 });
  if (draft === "CONFLICT") return NextResponse.json({ error: "This draft changed since you opened it. Your writing is still in the editor. Save as copy, or reload the latest draft.", code: "DRAFT_CONFLICT" }, { status: 409 });

  return NextResponse.json(draft);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (_request.headers.get("origin") !== new URL(process.env.APP_URL!).origin) return NextResponse.json({ error: "Submit this action from Signal." }, { status: 403 });
  const result = await prisma.$transaction(async (tx) => {
    const draft = await tx.contentDraft.findFirst({ where: { id, userId: session.user!.id } });
    if (!draft) return "MISSING";
    if (await tx.contentPublication.count({ where: { contentDraftId: id, status: { in: LOCKED_DELIVERIES } } })) return "LOCKED";
    await tx.contentDraft.delete({ where: { id } });
    return "DELETED";
  });
  if (result === "MISSING") return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  if (result === "LOCKED") return NextResponse.json({ error: "Keep this draft to preserve delivery history. Create a new copy instead." }, { status: 409 });

  return NextResponse.json({ success: true });
}
