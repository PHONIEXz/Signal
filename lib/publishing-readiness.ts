import { enabled } from "./service-config.ts";
import { isDraftImage } from "./draft-image.ts";
import { deliveryText } from "./content-publishing.ts";
export function schedulingEnabled() {
  return process.env.SIGNAL_SCHEDULING_ENABLED === "true" && process.env.SIGNAL_SCHEDULER_CONFIGURED === "true" && Boolean(process.env.CRON_SECRET?.trim()) && enabled("publishing");
}
export type ReadyAccount = { platform: string; platformUserId: string | null; expiresAt: Date | null; refreshToken: string | null };
export function publishingBlocker(account: ReadyAccount, text: string, mediaUrl: string | null, now = new Date()): string | null {
  if (!enabled("publishing")) return "Publishing is paused.";
  if (!["x", "facebook"].includes(account.platform)) return "Finish this post manually on TikTok.";
  if (account.platform === "facebook" && isDraftImage(mediaUrl)) return "Facebook images require manual attachment.";
  if (!text.trim()) return "Add a caption before publishing.";
  if (account.platform === "facebook" && (!account.platformUserId || !/^\d+$/.test(account.platformUserId))) return "Reconnect your Facebook Page.";
  if (account.expiresAt && account.expiresAt <= now && (account.platform !== "x" || !account.refreshToken)) return "Reconnect this expired account.";
  if (account.platform === "x" && Array.from(deliveryText(text,mediaUrl)).length > 280) return "Shorten the X post and links to 280 characters.";
  if (account.platform === "x" && (!process.env.X_CLIENT_ID || !process.env.X_CLIENT_SECRET)) return "X publishing setup is incomplete.";
  return null;
}
export function validSchedule(value: string, now = new Date()) {
  // Require an explicit offset; never let the server guess a local timezone.
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const date = new Date(value);
  const delay = date.getTime() - now.getTime();
  return Number.isFinite(delay) && delay >= 60000 && delay <= 90*86400000 ? date : null;
}
