import { configuredValue, emailDeliveryReady } from "./reset-config.ts";

export async function sendResetEmail(to: string, url: string) {
  await sendEmail(to, "Reset your Signal password",
    "Use this single-use link to choose a new Signal password:\n\n" + url +
    "\n\nIt expires in 30 minutes. If you didn't request it, ignore this email. Never share this link.");
}

export async function sendPasswordChangedEmail(to: string) {
  await sendEmail(to, "Your Signal password was changed",
    "Your Signal password was changed and previous Signal sessions were signed out. If this wasn't you, use Forgot password immediately and secure your email account.");
}

async function sendEmail(to: string, subject: string, text: string) {
  if (!emailDeliveryReady()) throw new Error("Email delivery is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + configuredValue(process.env.RESEND_API_KEY),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: configuredValue(process.env.EMAIL_FROM), to: [to], subject, text }),
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  // Don't echo provider response bodies, reset links, or recipient addresses.
  if (!response.ok) throw new Error("Email provider rejected delivery (" + response.status + ")");
}
