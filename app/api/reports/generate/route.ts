import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gemini } from "@/lib/gemini";

function cleanAiText(value: string) {
  return value
    .replace(/[—–]/g, "-")
    .replace(/\u2014|\u2013/g, "-")
    .trim();
}

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const connections = await prisma.connectedAccount.findMany({
      where: { userId: session.user.id },
      include: {
        metricSnapshots: {
          orderBy: { fetchedAt: "desc" },
          take: 2,
        },
        posts: {
          orderBy: { postedAt: "desc" },
          take: 12,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (connections.length === 0) {
      return NextResponse.json(
        { error: "Connect at least one account before generating a report." },
        { status: 400 }
      );
    }

    const accountData = connections.map((account) => {
      const current = account.metricSnapshots[0];
      const previous = account.metricSnapshots[1];

      return {
        platform: account.platform,
        displayName: account.displayName,
        current: current
          ? {
              followers: current.followersCount,
              following: current.followingCount,
              posts: current.postCount,
              likes: current.totalLikes,
              views: current.totalViews,
              postsAnalyzed: current.postsAnalyzed,
              fetchedAt: current.fetchedAt.toISOString(),
            }
          : null,
        previous: previous
          ? {
              followers: previous.followersCount,
              following: previous.followingCount,
              posts: previous.postCount,
              likes: previous.totalLikes,
              views: previous.totalViews,
              fetchedAt: previous.fetchedAt.toISOString(),
            }
          : null,
        recentPosts: account.posts.map((post) => ({
          text: post.text.slice(0, 280),
          likes: post.likeCount,
          views: post.viewCount,
          replies: post.replyCount,
          reposts: post.retweetCount,
          tags: post.tags,
          postedAt: post.postedAt?.toISOString() ?? null,
        })),
      };
    });

    const prompt = `You are Signal AI, the analytics and growth intelligence engine inside a social media dashboard.

Create a concise but useful cross-platform performance report from ONLY the supplied data.

Return valid JSON with exactly these keys:
{
  "summary": "2-4 sentence executive summary",
  "wins": ["3 short observations"],
  "opportunities": ["3 practical opportunities"],
  "actions": ["3 specific next actions"],
  "platformNotes": [
    {
      "platform": "platform name",
      "headline": "short headline",
      "detail": "short evidence-based explanation"
    }
  ]
}

Rules:
- Never invent missing numbers.
- If there is not enough history, explicitly say that more snapshots are needed.
- Do not promise growth, virality, reach or income.
- Keep every string concise and useful.
- Never use em dashes or en dashes.
- Use normal punctuation.
- Use short professional sentences.
- Avoid hype and marketing language.
- Do not confuse unavailable data with poor performance.
- Do not create conclusions from missing information.
- Do not use markdown fences.
- Do not include any keys other than the requested keys.

ACCOUNT DATA:
${JSON.stringify(accountData, null, 2)}
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

    const raw = cleanAiText(response.text ?? "");

    let report: unknown;

    try {
      report = JSON.parse(raw);
    } catch {
      const withoutFences = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      report = JSON.parse(withoutFences);
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Signal AI report error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate report",
      },
      { status: 500 }
    );
  }
}
