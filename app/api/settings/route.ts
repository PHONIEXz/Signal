import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      aiInsightsEnabled: true,
      personalizedRecommendationsEnabled: true,
      analyticsCollectionEnabled: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(user);
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const allowedFields = [
    "aiInsightsEnabled",
    "personalizedRecommendationsEnabled",
    "analyticsCollectionEnabled",
  ] as const;

  const data: Partial<
    Record<(typeof allowedFields)[number], boolean>
  > = {};

  for (const field of allowedFields) {
    if (field in body) {
      if (typeof body[field] !== "boolean") {
        return NextResponse.json(
          { error: `${field} must be a boolean` },
          { status: 400 }
        );
      }

      data[field] = body[field];
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No valid settings provided" },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      aiInsightsEnabled: true,
      personalizedRecommendationsEnabled: true,
      analyticsCollectionEnabled: true,
    },
  });

  return NextResponse.json(user);
}
