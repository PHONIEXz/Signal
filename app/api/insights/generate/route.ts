import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gemini } from "@/lib/gemini";

function cleanAiText(value: string) {
  return value.replace(/[—–]/g, "-").trim();
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { platform = "x" } = await request.json();

    const connectedAccount = await prisma.connectedAccount.findUnique({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform,
        },
      },
    });

    if (!connectedAccount) {
      return NextResponse.json(
        { error: `No ${platform} account connected` },
        { status: 404 }
      );
    }

    const latestSnapshot = await prisma.metricSnapshot.findFirst({
      where: { connectedAccountId: connectedAccount.id },
      orderBy: { fetchedAt: "desc" },
    });

    const previousSnapshot = await prisma.metricSnapshot.findFirst({
      where: { connectedAccountId: connectedAccount.id },
      orderBy: { fetchedAt: "desc" },
      skip: 1,
    });

    const posts = await prisma.post.findMany({
      where: { connectedAccountId: connectedAccount.id },
      orderBy: { postedAt: "desc" },
      take: 10,
    });

    if (!latestSnapshot) {
      return NextResponse.json({
        insight:
          "Signal needs at least one metrics refresh before it can analyze your account.",
      });
    }

    const followerChange = previousSnapshot
      ? latestSnapshot.followersCount - previousSnapshot.followersCount
      : 0;

    const engagementRate =
      latestSnapshot.totalViews > 0
        ? (latestSnapshot.totalLikes / latestSnapshot.totalViews) * 100
        : 0;

    const postsSummary = posts
      .map(
        (post, index) =>
          `${index + 1}. "${post.text.slice(0, 250)}" - ${post.likeCount} likes, ${post.viewCount} views, ${post.replyCount} replies, ${post.retweetCount} reposts`
      )
      .join("\n");

    const prompt = `
You are Signal AI, an intelligent social media growth analyst.

Analyze this user's ${platform} account and give ONE useful insight.

Your response must contain:

1. What is happening
2. Why it matters
3. One specific next action

Writing rules:

- Be concise, practical, and professional.
- Use short clear sentences.
- Never use em dashes or en dashes.
- Avoid dramatic AI language.
- Avoid phrases like "unlock growth", "game changer", "skyrocket", or "revolutionary".
- Do not invent missing information.
- Do not treat missing data as zero performance.
- If data is unavailable, clearly say it is unavailable.
- Give specific actions based only on the available data.

Writing rules:

- Be concise, practical, and professional.
- Use short clear sentences.
- Never use em dashes or en dashes.
- Avoid dramatic AI language.
- Avoid phrases like "unlock growth", "game changer", "skyrocket", or "revolutionary".
- Do not invent missing information.
- Do not treat missing data as zero performance.
- If data is unavailable, clearly say it is unavailable.
- Give specific actions based only on the available data.ACCOUNT DATA

Followers: ${latestSnapshot.followersCount}
Following: ${latestSnapshot.followingCount}
Total posts: ${latestSnapshot.postCount}

Likes: ${latestSnapshot.totalLikes}
Views: ${latestSnapshot.totalViews}
Engagement rate: ${engagementRate.toFixed(1)}%

Follower change since previous snapshot:
${followerChange >= 0 ? "+" : ""}${followerChange}

RECENT POSTS

${postsSummary || "No recent posts available."}
`;

    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash-lite",
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

    return NextResponse.json({ insight });
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
