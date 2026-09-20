import { attachMeasurementEvidence } from "@/lib/measurement-evidence";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gemini } from "@/lib/gemini";
import { normalizeSampleSize } from "@/lib/metrics";
import {
  BALANCED_INTELLIGENCE_RULES,
  buildAccountEvidence,
  cleanAiText,
  SIGNAL_AI_MODEL,
} from "@/lib/signal-intelligence";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { platform = "x", postLimit } = await request.json();

    const connectedAccount = await prisma.connectedAccount.findUnique({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform,
        },
      },
      include: { user: { select: { plan: true } } },
    });

    if (!connectedAccount) {
      return NextResponse.json(
        { error: `No ${platform} account connected` },
        { status: 404 }
      );
    }

    const sampleSize = normalizeSampleSize(
      typeof postLimit === "number" || typeof postLimit === "string"
        ? postLimit
        : undefined,
      connectedAccount.user.plan
    );

    const snapshots = await prisma.metricSnapshot.findMany({
      where: { connectedAccountId: connectedAccount.id, sampleSize },
      orderBy: { fetchedAt: "desc" },
      take: 12,
    });

    const posts = await prisma.post.findMany({
      where: { connectedAccountId: connectedAccount.id },
      orderBy: { postedAt: "desc" },
      take: sampleSize,
    });

    if (!snapshots[0]) {
      return NextResponse.json({
        insight:
          `Refresh metrics for the last ${sampleSize} posts before Signal analyzes this sample.`,
        meta: {
          mode: "balanced",
          dataConfidence: { score: 0, label: "limited" },
        },
      });
    }

    const evidence = buildAccountEvidence({
      platform,
      requestedSampleSize: sampleSize,
      snapshots,
      posts: await attachMeasurementEvidence(posts),
    });

    const prompt = `
${BALANCED_INTELLIGENCE_RULES}

Analyze this user's ${platform} account and give one useful insight.

Your response must contain:

1. What is happening
2. Why it matters
3. One specific next action

Start with "Evidence confidence: [label] ([score]/100)."
Do not expose your hidden reasoning process.

VERIFIED ACCOUNT EVIDENCE
${JSON.stringify(evidence, null, 2)}
`;

    const response = await gemini.models.generateContent({
      model: SIGNAL_AI_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const insight = cleanAiText(
      response.text?.trim() ||
        "Signal couldn't generate an insight right now."
    );

    return NextResponse.json({
      insight,
      meta: {
        mode: evidence.mode,
        dataConfidence: evidence.dataConfidence,
        sample: evidence.sample,
      },
    });
  } catch (error) {
    console.error("Signal AI insight error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate insight",
      },
      { status: 500 }
    );
  }
}
