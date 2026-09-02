import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  draftLimitForPlan,
  MAX_DRAFT_LENGTH,
  normalizePlan,
} from "@/lib/content-drafts";

function parseScheduledFor(value: unknown) {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const drafts = await prisma.contentDraft.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      targets: {
        include: {
          connectedAccount: {
            select: { id: true, platform: true, displayName: true },
          },
        },
      },
    },
  });

  return NextResponse.json(drafts);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl.trim() : "";
  const targetIds = Array.isArray(body.targetIds)
    ? [...new Set(body.targetIds.filter((id): id is string => typeof id === "string"))]
    : [];
  const scheduledFor = parseScheduledFor(body.scheduledFor);

  if (!text || text.length > MAX_DRAFT_LENGTH) {
    return NextResponse.json(
      { error: `Content must contain between 1 and ${MAX_DRAFT_LENGTH} characters.` },
      { status: 400 }
    );
  }
  if (targetIds.length === 0) {
    return NextResponse.json({ error: "Choose at least one connected account." }, { status: 400 });
  }
  if (scheduledFor === undefined) {
    return NextResponse.json({ error: "The scheduled date is invalid." }, { status: 400 });
  }
  if (mediaUrl) {
    try {
      new URL(mediaUrl);
    } catch {
      return NextResponse.json({ error: "Media URL must be a valid URL." }, { status: 400 });
    }
  }

  const [user, ownedTargets, draftCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { plan: true } }),
    prisma.connectedAccount.findMany({
      where: { id: { in: targetIds }, userId: session.user.id },
      select: { id: true },
    }),
    prisma.contentDraft.count({ where: { userId: session.user.id } }),
  ]);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (ownedTargets.length !== targetIds.length) {
    return NextResponse.json({ error: "One or more selected accounts are unavailable." }, { status: 400 });
  }

  const plan = normalizePlan(user.plan);
  const limit = draftLimitForPlan(plan);
  if (limit !== null && draftCount >= limit) {
    return NextResponse.json(
      { error: `Free accounts can save up to ${limit} drafts. Upgrade to Pro for unlimited drafts.` },
      { status: 403 }
    );
  }
  if (plan !== "PRO" && targetIds.length > 1) {
    return NextResponse.json(
      { error: "Multi-platform drafts are available on Pro." },
      { status: 403 }
    );
  }

  const draft = await prisma.contentDraft.create({
    data: {
      userId: session.user.id,
      text,
      mediaUrl: mediaUrl || null,
      status: scheduledFor ? "SCHEDULED" : "DRAFT",
      scheduledFor,
      targets: { create: targetIds.map((connectedAccountId) => ({ connectedAccountId })) },
    },
    include: {
      targets: {
        include: {
          connectedAccount: { select: { id: true, platform: true, displayName: true } },
        },
      },
    },
  });

  return NextResponse.json(draft, { status: 201 });
}
