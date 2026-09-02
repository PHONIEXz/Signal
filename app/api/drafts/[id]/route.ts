import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MAX_DRAFT_LENGTH, normalizePlan } from "@/lib/content-drafts";

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
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl.trim() : "";
  const targetIds = Array.isArray(body.targetIds)
    ? [...new Set(body.targetIds.filter((targetId): targetId is string => typeof targetId === "string"))]
    : [];
  const scheduledFor = parseScheduledFor(body.scheduledFor);

  if (!text || text.length > MAX_DRAFT_LENGTH) {
    return NextResponse.json(
      { error: `Content must contain between 1 and ${MAX_DRAFT_LENGTH} characters.` },
      { status: 400 }
    );
  }
  if (!targetIds.length || scheduledFor === undefined) {
    return NextResponse.json({ error: "Choose an account and provide a valid date." }, { status: 400 });
  }
  if (mediaUrl) {
    try {
      new URL(mediaUrl);
    } catch {
      return NextResponse.json({ error: "Media URL must be a valid URL." }, { status: 400 });
    }
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

  const draft = await prisma.contentDraft.update({
    where: { id },
    data: {
      text,
      mediaUrl: mediaUrl || null,
      scheduledFor,
      status: scheduledFor ? "SCHEDULED" : "DRAFT",
      targets: {
        deleteMany: {},
        create: targetIds.map((connectedAccountId) => ({ connectedAccountId })),
      },
    },
    include: {
      targets: {
        include: {
          connectedAccount: { select: { id: true, platform: true, displayName: true } },
        },
      },
    },
  });

  return NextResponse.json(draft);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const result = await prisma.contentDraft.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (!result.count) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
