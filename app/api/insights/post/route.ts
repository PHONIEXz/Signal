import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gemini } from "@/lib/gemini";

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

  const systemPrompt = `
You are Signal AI, a social media growth analyst.

You are analyzing ONE specific ${platformLabel} post belonging to the authenticated user.

Be useful, honest and specific.

Do not invent metrics or facts that are not provided.

Writing rules:

- Use short professional sentences.
- Never use em dashes or en dashes.
- Avoid hype language.
- Focus on measurable observations.
- Separate facts from recommendations.
- Do not claim something caused growth unless the data supports it.

POST:
"${post.text}"

POST METRICS:
- Likes: ${post.likeCount}
- Views: ${account.platform === "facebook" ? "Unavailable" : post.viewCount}
- Replies: ${post.replyCount}
- Reposts: ${post.retweetCount}
- Quotes: ${post.quoteCount}
- Posted: ${
    post.postedAt
      ? post.postedAt.toISOString()
      : "Unknown"
  }

ACCOUNT:
- Platform: ${platformLabel}
- Followers: ${
    latestSnapshot?.followersCount ?? "Unknown"
  }
- Following: ${
    latestSnapshot?.followingCount ?? "Unknown"
  }
- Total posts: ${
    latestSnapshot?.postCount ?? "Unknown"
  }

When analyzing performance, distinguish between:
1. What the available numbers actually show.
2. What is a reasonable interpretation.
3. What is uncertain.

Focus on practical advice the creator can actually use.

Keep answers concise unless the user asks for a detailed analysis.
`;

  try {
    const response =
      await gemini.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: messages.map(
          (message: {
            role: string;
            content: string;
          }) => ({
            role:
              message.role === "assistant"
                ? "model"
                : "user",
            parts: [
              {
                text: message.content,
              },
            ],
          })
        ),
        config: {
          systemInstruction: systemPrompt,
        },
      });

    return NextResponse.json({
      reply: response.text ?? "",
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
