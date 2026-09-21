import { validAiReport } from "@/lib/ai-report";
import { attachMeasurementEvidence } from "@/lib/measurement-evidence";
import { NextResponse } from "next/server";
import { withAiRequest } from "@/lib/ai-request";
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
  return withAiRequest(request,async (userId,body) => {


    const user=await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    const sampleSize=normalizeSampleSize(
      typeof body.postLimit==="number"||typeof body.postLimit==="string"
        ? body.postLimit
        :undefined,
      user?.plan
    );

    const connections=await prisma.connectedAccount.findMany({
      where: { userId },
      include: {
        metricSnapshots: {
          orderBy: { fetchedAt: "desc" },
          take: 12,
        },
        posts: {
          orderBy: { postedAt: "desc" },
          take: sampleSize,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if(connections.length===0) {
      return NextResponse.json(
        { error: "Connect at least one account before generating a report." },
        { status: 400 }
      );
    }

    const accountData=await Promise.all(connections.map(async (account) => {
      return {
        displayName: account.displayName,
        evidence: buildAccountEvidence({
          platform: account.platform,
          requestedSampleSize: sampleSize,
          snapshots: account.metricSnapshots,
          posts: await attachMeasurementEvidence(account.posts),
        }),
      };
    }));

    const prompt=`${BALANCED_INTELLIGENCE_RULES}

You are Signal AI, the analytics and growth intelligence engine inside a social media dashboard.

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
- Likes, views and engagement are calculated only from each platform's selected recent-post sample.
- State the actual posts analyzed when it is less than the requested sample.
- Do not use markdown fences.
- Do not include any keys other than the requested keys.

ACCOUNT DATA:
${JSON.stringify(accountData,null,2)}
`;

    const response=await gemini.models.generateContent({
      model: SIGNAL_AI_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const raw=cleanAiText(response.text??"");

    let report: unknown;

    try {
      report=JSON.parse(raw);
    } catch {
      const withoutFences=raw
        .replace(/^```json\s*/i,"")
        .replace(/^```\s*/i,"")
        .replace(/\s*```$/i,"")
        .trim();

      report=JSON.parse(withoutFences);
    }

    if(!validAiReport(report)) throw new Error("Invalid AI report shape");
    return NextResponse.json({ report });
  });
}
