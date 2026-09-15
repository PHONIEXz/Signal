import { after, NextResponse } from "next/server";
import { AuthInputError, PRIVATE_HEADERS, readAuthBody } from "@/lib/auth-http";
import { emailValue, passwordError } from "@/lib/auth-policy";
import { consumeResetCode, consumeResetToken, takeAuthQuota } from "@/lib/password-reset";
import { emailDeliveryReady } from "@/lib/reset-config";
import { sendPasswordChangedEmail } from "@/lib/reset-email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const reply = (data: object, status = 200) =>
    NextResponse.json(data, { status, headers: PRIVATE_HEADERS });
  try {
    const { token, email, code, password, confirmPassword } = await readAuthBody(request);
    const codeMode = code !== undefined;
    const address = emailValue(email);
    const invalid = codeMode ? "This code is incorrect, expired, used, or has too many attempts. Request a new code." : "This reset link has expired or was already used. Request a new one.";
    if (codeMode ? (!address || typeof code !== "string" || !/^\d{6}$/.test(code) || token !== undefined) : (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))) return reply({ error: invalid }, 400);
    const validation = passwordError(password);
    if (validation) return reply({ error: validation }, 400);
    if (password !== confirmPassword) return reply({ error: "The passwords do not match." }, 400);
    if (!(await takeAuthQuota("reset-global", "all", 100, 15 * 60 * 1000)) ||
        !(await takeAuthQuota(codeMode ? "reset-code-email" : "reset-token", codeMode ? address! : token as string, codeMode ? 15 : 5, 15 * 60 * 1000))) {
      return reply({ error: "Too many attempts. Please wait 15 minutes or request fresh recovery details." }, 429);
    }
    const user = codeMode ? await consumeResetCode(address!, code as string, password as string) : await consumeResetToken(token as string, password as string);
    if (!user) return reply({ error: invalid }, 400);
    if (emailDeliveryReady()) {
      after(async () => {
        try { await sendPasswordChangedEmail(user.email); }
        catch { console.error("Password-change notification could not be delivered."); }
      });
    }
    return reply({ message: "Password changed. Sign in again with your new password." });
  } catch (error) {
    if (error instanceof AuthInputError) return reply({ error: error.message }, error.status);
    console.error("Password reset completion unavailable.");
    return reply({ error: "Unable to reset your password right now. Please try again." }, 503);
  }
}
