import { after, NextResponse } from "next/server";
import { AuthInputError, PRIVATE_HEADERS, readAuthBody } from "@/lib/auth-http";
import { emailValue } from "@/lib/auth-policy";
import { emailDeliveryReady } from "@/lib/reset-config";
import { GENERIC_RESET_MESSAGE, issueResetLink, takeAuthQuota } from "@/lib/password-reset";
import { sendResetEmail } from "@/lib/reset-email";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const reply = (data: object, status = 200) =>
    NextResponse.json(data, { status, headers: PRIVATE_HEADERS });
  try {
    const body = await readAuthBody(request);
    const email = emailValue(body.email);
    if (!email) return reply({ error: "Enter a valid email address." }, 400);
    if (!emailDeliveryReady()) {
      return reply({ error: "Password-reset email is not configured yet. Try your usual sign-in method." }, 503);
    }
    if (!(await takeAuthQuota("forgot-global", "all", 60, 15 * 60 * 1000))) {
      return reply({ error: "Too many requests. Please try again in 15 minutes." }, 429);
    }
    const allowed = await takeAuthQuota("forgot-email", email, 3, 60 * 60 * 1000);
    if (allowed) {
      // Account lookup/delivery happen after the same response, so delivery
      // timing cannot reveal which accounts exist.
      after(async () => {
        let issued: Awaited<ReturnType<typeof issueResetLink>> = null;
        try {
          issued = await issueResetLink(email);
          if (issued) await sendResetEmail(issued.email, issued.url);
        } catch {
          if (issued) {
            await prisma.passwordResetToken.deleteMany({ where: { tokenHash: issued.tokenHash } })
              .catch(() => console.error("Password reset cleanup failed"));
          }
          console.error("Password reset delivery failed; check provider configuration and availability.");
        }
      });
    }
    return reply({ message: GENERIC_RESET_MESSAGE });
  } catch (error) {
    if (error instanceof AuthInputError) return reply({ error: error.message }, error.status);
    console.error("Password reset request unavailable; check server configuration.");
    return reply({ error: "Password reset is temporarily unavailable. Please try again later." }, 503);
  }
}
