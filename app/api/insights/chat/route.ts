import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gemini } from "@/lib/gemini";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { messages, platform = "x" } = await request.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No messages provided" }, { status: 400 });
  }

  const connectedAccount = await prisma.connectedAccount.findUnique({
    where: { userId_platform: { userId: session.user.id, platform } },
  });

  if (!connectedAccount) {
    return NextResponse.json({ error: `No ${platform} account connected` }, { status: 404 });
  }

  const latestSnapshot = await prisma.metricSnapshot.findFirst({
    where: { connectedAccountId: connectedAccount.id },
    orderBy: { fetchedAt: "desc" },
  });

  const oldestSnapshot = await prisma.metricSnapshot.findFirst({
    where: { connectedAccountId: connectedAccount.id },
    orderBy: { fetchedAt: "asc" },
  });

  const posts = await prisma.post.findMany({
    where: { connectedAccountId: connectedAccount.id },
    orderBy: { postedAt: "desc" },
    take: 20,
  });

  const followerChange =
    latestSnapshot && oldestSnapshot
      ? latestSnapshot.followersCount - oldestSnapshot.followersCount
      : null;

  const postsSummary = posts
    .map((p, i) => {
      const tags = p.tags ? ` [tags: ${p.tags}]` : "";
      return `${i + 1}. "${p.text.slice(0, 200)}"${tags} — ${p.likeCount} likes, ${p.viewCount} views, ${p.replyCount} replies, ${p.retweetCount} reposts`;
    })
    .join("\n");

  const platformLabel =
    platform === "x" ? "X (Twitter)" : platform === "facebook" ? "Facebook Page" : platform;

  const systemPrompt = `You are a social media growth assistant built into this user's own analytics dashboard for their ${platformLabel} account. Answer their questions helpfully and specifically, using the data below. Be concise — a few sentences unless they ask for more detail. If something isn't in the data provided, say so rather than guessing.

Current stats:
- Followers: ${latestSnapshot?.followersCount ?? "unknown"}
- Following: ${latestSnapshot?.followingCount ?? "unknown"}
- Total posts: ${latestSnapshot?.postCount ?? "unknown"}
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

    const reply = response.text ?? "";

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get a response" },
      { status: 500 }
    );
  }
}

