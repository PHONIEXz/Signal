import { isDraftImage } from "./draft-image.ts";

export type PublishingReadiness = "Ready to publish" | "Reconnect needed" | "Manual posting only";
export function publishingReadiness(platform: string, mediaUrl: string | null, status?: string | null, reconnectNeeded = false): PublishingReadiness {
  if (!["x", "facebook"].includes(platform) || (isDraftImage(mediaUrl) && platform !== "x")) return "Manual posting only";
  if (reconnectNeeded || status === "PERMISSION_REQUIRED") return "Reconnect needed";
  if (["BILLING_REQUIRED", "RATE_LIMITED", "FAILED", "ASSISTED_ONLY"].includes(status ?? "")) return "Manual posting only";
  return "Ready to publish";
}

// Keep provider diagnostics stored server-side, while giving users an actionable message.
export function publishingMessage(code?: string | null, fallback?: string | null) {
  if (code === "BILLING_REQUIRED") return "Direct publishing is temporarily unavailable. You can copy and open the platform to post manually.";
  if (code === "PERMISSION_REQUIRED") return "Reconnect this account to restore publishing access. If reconnecting does not help, use manual posting for now.";
  return fallback || "Delivery could not be confirmed. Check the platform before trying again.";
}
