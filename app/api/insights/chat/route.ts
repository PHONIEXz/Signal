import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gemini } from "@/lib/gemini";
import { normalizeSampleSize, summarizePosts } from "@/lib/metrics";

function cleanAiText(value: string) {
  return value.replace(/[—–]/g, "-").trim();
}

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

  const latestSnapshot = await prisma.metricSnapshot.findFirst({
    where: { connectedAccountId: connectedAccount.id, sampleSize },
    orderBy: { fetchedAt: "desc" },
  });

  const oldestSnapshot = await prisma.metricSnapshot.findFirst({
    where: { connectedAccountId: connectedAccount.id, sampleSize },
    orderBy: { fetchedAt: "asc" },
  });

  const posts = await prisma.post.findMany({
    where: { connectedAccountId: connectedAccount.id },
    orderBy: { postedAt: "desc" },
    take: sampleSize,
  });
  const postMetrics = summarizePosts(posts, platform);

  const followerChange =
    latestSnapshot && oldestSnapshot
      ? latestSnapshot.followersCount - oldestSnapshot.followersCount
      : null;

  const postsSummary = posts
    .map((p, i) => {
      const tags = p.tags ? ` [tags: ${p.tags}]` : "";

      const views = platform === "facebook" ? "views unavailable" : `${p.viewCount} views`;
      return `${i + 1}. "${p.text.slice(0, 200)}"${tags} - ${p.likeCount} likes, ${views}, ${p.replyCount} replies, ${p.retweetCount} reposts, ${p.quoteCount} quotes`;
    })
    .join("\n");

  const platformLabel =
    platform === "x"
      ? "X"
      : platform === "facebook"
        ? "Facebook Page"
        : platform;

  const systemPrompt = `You are Signal AI, a social media growth assistant built into this user's analytics dashboard for their ${platformLabel} account.

Answer questions helpfully and specifically using the data below.
Writing rules:

- Be concise unless the user requests detail.
- Use professional natural language.
- Never use em dashes or en dashes.
- Avoid generic motivational statements.
- Do not exaggerate results.
- Do not make assumptions beyond the available analytics.
- Explain missing data clearly.

Current stats:
- Followers: ${latestSnapshot?.followersCount ?? "unknown"}
- Following: ${latestSnapshot?.followingCount ?? "unknown"}
- Total posts: ${latestSnapshot?.postCount ?? "unknown"}
- Requested recent-post sample: ${sampleSize}
- Posts actually available: ${posts.length}
- Likes in available sample: ${postMetrics.likes ?? "unknown"}
- Views in available sample: ${postMetrics.views ?? "unknown"}
- Interactions in available sample: ${postMetrics.engagements ?? "unknown"}
- Engagement rate by views: ${postMetrics.engagementRate === null ? "unknown" : `${postMetrics.engagementRate.toFixed(1)}%`}
${followerChange !== null ? `- Follower change since tracking began: ${followerChange > 0 ? "+" : ""}${followerChange}` : ""}

Recent posts (most recent ${posts.length}), including any tags the user has added:
${postsSummary || "No posts recorded yet."}`;

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return NextResponse.json({
      reply: cleanAiText(response.text ?? ""),
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
