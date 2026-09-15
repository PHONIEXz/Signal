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
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { messages, platform = "x", postLimit } = await request.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "No messages provided" },
      { status: 400 }
    );
  }

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
  const evidence = buildAccountEvidence({
    platform,
    requestedSampleSize: sampleSize,
    snapshots,
    posts: await attachMeasurementEvidence(posts),
  });

  const platformLabel =
    platform === "x"
      ? "X"
      : platform === "facebook"
        ? "Facebook Page"
        : platform;

  const systemPrompt = `${BALANCED_INTELLIGENCE_RULES}

You are answering questions inside the user's ${platformLabel} analytics dashboard.
Answer from the verified evidence below. When useful, structure the answer as Observation, Interpretation and Next move.
Do not expose your hidden reasoning process.

VERIFIED ACCOUNT EVIDENCE
${JSON.stringify(evidence, null, 2)}`;

  try {
    const response = await gemini.models.generateContent({
      model: SIGNAL_AI_MODEL,
      contents: messages
        .filter(
          (message: { role?: unknown; content?: unknown }) =>
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string"
        )
        .slice(-10)
        .map((message: { role: string; content: string }) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content.slice(0, 2_000) }],
        })),
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return NextResponse.json({
      reply: cleanAiText(response.text ?? ""),
      meta: {
        mode: evidence.mode,
        dataConfidence: evidence.dataConfidence,
        sample: evidence.sample,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to get a response",
      },
      { status: 500 }
    );
  }
}
