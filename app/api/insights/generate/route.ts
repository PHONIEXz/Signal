import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gemini } from "@/lib/gemini";
import {
  calculateEngagementRate,
  normalizeSampleSize,
} from "@/lib/metrics";

function cleanAiText(value: string) {
  return value.replace(/[—–]/g, "-").trim();
}

function formatMetric(value: number | null) {
  return value === null ? "Unavailable" : String(value);
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

    const latestSnapshot = await prisma.metricSnapshot.findFirst({
      where: { connectedAccountId: connectedAccount.id, sampleSize },
      orderBy: { fetchedAt: "desc" },
    });

    const previousSnapshot = await prisma.metricSnapshot.findFirst({
      where: { connectedAccountId: connectedAccount.id, sampleSize },
      orderBy: { fetchedAt: "desc" },
      skip: 1,
    });

    const posts = await prisma.post.findMany({
      where: { connectedAccountId: connectedAccount.id },
      orderBy: { postedAt: "desc" },
      take: sampleSize,
    });

    if (!latestSnapshot) {
      return NextResponse.json({
        insight:
          `Refresh metrics for the last ${sampleSize} posts before Signal analyzes this sample.`,
      });
    }

    const followerChange = previousSnapshot
      ? latestSnapshot.followersCount - previousSnapshot.followersCount
      : null;

    const engagementRate = calculateEngagementRate(
      latestSnapshot.totalEngagements,
      latestSnapshot.totalViews
    );

    const postsSummary = posts
      .map(
        (post, index) => {
          const views =
            platform === "facebook"
              ? "views unavailable"
              : `${post.viewCount} views`;

          return `${index + 1}. "${post.text.slice(0, 250)}" - ${post.likeCount} likes, ${views}, ${post.replyCount} replies, ${post.retweetCount} reposts, ${post.quoteCount} quotes`;
        }
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

ACCOUNT DATA

Followers: ${latestSnapshot.followersCount}
Following: ${formatMetric(latestSnapshot.followingCount)}
Total posts: ${formatMetric(latestSnapshot.postCount)}

Requested recent-post sample: ${sampleSize}
Posts actually analyzed: ${latestSnapshot.postsAnalyzed}
Post metric availability: ${latestSnapshot.postMetricsStatus}
Likes in sample: ${formatMetric(latestSnapshot.totalLikes)}
Views in sample: ${formatMetric(latestSnapshot.totalViews)}
Interactions in sample: ${formatMetric(latestSnapshot.totalEngagements)}
Engagement rate by views: ${engagementRate === null ? "Unavailable" : `${engagementRate.toFixed(1)}%`}

Follower change since previous snapshot:
${followerChange === null ? "Unavailable" : `${followerChange >= 0 ? "+" : ""}${followerChange}`}

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
