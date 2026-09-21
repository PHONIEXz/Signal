import { reserveUsage, recordUsageFailure, UsageError } from "./service-usage.ts";
import { conversationalReply } from "./chat-intent.ts";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withAiPreferences } from "./ai-access.ts";
import { AuthInputError, PRIVATE_HEADERS, readAuthBody, requestOrigin } from "./auth-http.ts";

export async function withAiRequest(request: Request, run: (userId: string, body: Record<string, unknown>) => Promise<Response>) {
  const json = (body: unknown, status: number) => Response.json(body, { status, headers: PRIVATE_HEADERS });
  try {
    const session = await auth();
    if (!session?.user?.id) return json({ error: "Not authenticated" }, 401);
    const userId = session.user.id;
    const preferences = await prisma.user.findUnique({
      where: { id: userId },
      select: { aiInsightsEnabled: true, personalizedRecommendationsEnabled: true, plan: true },
    });
    const result = await withAiPreferences(preferences, async () => {
      const body = await readAuthBody(request, 32_768, requestOrigin(request));
      const path = new URL(request.url).pathname;
      const greeting = ["/api/insights/chat", "/api/insights/post"].includes(path) ? conversationalReply(body.messages) : null;
      if (greeting) return json({ reply: greeting }, 200);
      await reserveUsage("ai", userId, preferences!.plan);
      const response = await run(userId, body);
      if (response.status >= 500) await recordUsageFailure("ai");
      return response;
    });
    if (!result.allowed) return json({ error: result.error, code: result.code }, 403);
    for (const [key, value] of Object.entries(PRIVATE_HEADERS)) result.value.headers.set(key, value);
    return result.value;
  } catch (error) {
    if (error instanceof UsageError) return json({ error: error.message + (error.resetAt ? ` Resets ${error.resetAt.slice(0,10)} at 00:00 UTC.` : ""), resetAt: error.resetAt }, error.status);
    if (error instanceof AuthInputError) return json({ error: error.message }, error.status);
    await recordUsageFailure("ai");
    const reference = crypto.randomUUID();
    // Never log provider error objects: they may contain prompts or credentials.
    console.error("Signal AI request failed", { reference, event: "AI_REQUEST_FAILED" });
    return json({ error: "Signal AI could not complete this request. Please try again shortly.", reference }, 503);
  }
}
