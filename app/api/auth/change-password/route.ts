import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AuthInputError, PRIVATE_HEADERS, readAuthBody } from "@/lib/auth-http";
import { passwordError } from "@/lib/auth-policy";
import { takeAuthQuota } from "@/lib/password-reset";
import { changePassword } from "@/lib/password-change";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const reply = (data: object, status = 200) => NextResponse.json(data, { status, headers: PRIVATE_HEADERS });
  try {
    const session = await auth();
    if (!session?.user?.id) return reply({ error: "Please sign in again." }, 401);
    const { currentPassword, password, confirmPassword } = await readAuthBody(request);
    if (typeof currentPassword !== "string" || !currentPassword) return reply({ error: "Enter your current password." }, 400);
    const validation = passwordError(password);
    if (validation) return reply({ error: validation }, 400);
    if (password !== confirmPassword) return reply({ error: "The new passwords do not match." }, 400);
    if (currentPassword === password) return reply({ error: "Choose a different password." }, 400);
    if (!(await takeAuthQuota("change-password", session.user.id, 5, 15 * 60000))) return reply({ error: "Too many attempts. Please wait 15 minutes." }, 429);
    const outcome = await changePassword(session.user.id, currentPassword, password as string);
    if (outcome === "PROVIDER_ACCOUNT") return reply({ error: "This account has no separate Signal password. Manage it with your sign-in provider." }, 409);
    if (outcome === "INCORRECT_PASSWORD") return reply({ error: "Your current password is incorrect." }, 400);
    if (outcome === "STALE_PASSWORD") return reply({ error: "Your password changed during this request. Please sign in again." }, 409);
    return reply({ message: "Password changed. Sign in again with your new password." });
  } catch (error) {
    if (error instanceof AuthInputError) return reply({ error: error.message }, error.status);
    console.error("Authenticated password change unavailable.");
    return reply({ error: "Unable to change your password right now." }, 503);
  }
}
