import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gemini } from "@/lib/gemini";
import {
  BALANCED_INTELLIGENCE_RULES,
  buildPostEvidence,
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

  const { postId, messages } = await request.json();

  if (!postId) {
    return NextResponse.json(
      { error: "Post ID is required." },
      { status: 400 }
    );
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "No messages provided." },
      { status: 400 }
    );
  }

  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },
    include: {
      connectedAccount: true,
    },
  });

  if (!post) {
    return NextResponse.json(
      { error: "Post not found." },
      { status: 404 }
    );
  }

  if (post.connectedAccount.userId !== session.user.id) {
    return NextResponse.json(
      { error: "You do not have access to this post." },
      { status: 403 }
    );
  }

  const account = post.connectedAccount;

  const latestSnapshot =
    await prisma.metricSnapshot.findFirst({
      where: {
        connectedAccountId: account.id,
      },
      orderBy: {
        fetchedAt: "desc",
      },
    });

  const platformLabel =
    account.platform === "x"
      ? "X"
      : account.platform.charAt(0).toUpperCase() +
        account.platform.slice(1);

  const evidence = buildPostEvidence({
    platform: account.platform,
    post,
    latestSnapshot,
  });

  const systemPrompt = `
${BALANCED_INTELLIGENCE_RULES}

You are analyzing ONE specific ${platformLabel} post belonging to the authenticated user.

When analyzing performance, distinguish between:
1. What the available numbers actually show.
2. What is a reasonable interpretation.
3. What is uncertain.

Keep answers concise unless the user asks for a detailed analysis.
Do not expose your hidden reasoning process.

VERIFIED POST EVIDENCE
${JSON.stringify(evidence, null, 2)}
`;

  try {
    const response =
      await gemini.models.generateContent({
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
      },
    });
  } catch (error) {
    console.error("Post AI error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze post.",
      },
      { status: 500 }
    );
  }
}
