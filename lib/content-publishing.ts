export const LOCKED_DELIVERIES = ["PUBLISHING", "PUBLISHED", "UNKNOWN"];
export const RETRYABLE_DELIVERIES = ["PENDING", "FAILED", "PERMISSION_REQUIRED", "RATE_LIMITED", "BILLING_REQUIRED"];
export function deliveryText(text: string, mediaUrl: string | null) {
  return mediaUrl && !text.includes(mediaUrl) ? `${text}\n\n${mediaUrl}` : text;
}
export function assistedPublishUrl(platform: string, text: string, mediaUrl: string | null, platformUserId?: string | null) {
  if (platform === "x") return `https://x.com/intent/post?text=${encodeURIComponent(deliveryText(text, mediaUrl))}`;
  if (platform === "tiktok") return "https://www.tiktok.com/upload";
  if (platform === "facebook" && platformUserId && /^\d+$/.test(platformUserId)) return `https://www.facebook.com/${platformUserId}`;
  return "https://www.facebook.com/";
}
export class PublishError extends Error {
  code: string;
  constructor(code: string, message: string) { super(message); this.code = code; }
}
type Input = { platform: string; platformUserId: string | null; token: string; text: string; mediaUrl: string | null };
export async function sendPost(input: Input, request: typeof fetch = fetch) {
  const { platform, platformUserId, token, text, mediaUrl } = input;
  if (!["x", "facebook"].includes(platform)) throw new PublishError("ASSISTED_ONLY", "Copy this draft and open TikTok to finish uploading your video.");
  if (!text.trim()) throw new PublishError("FAILED", "Add post content first.");
  if (mediaUrl) {
    try { const url = new URL(mediaUrl); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error(); }
    catch { throw new PublishError("FAILED", "Use a public HTTP or HTTPS link."); }
  }
  const bodyText = deliveryText(text, mediaUrl);
  if (platform === "x" && Array.from(bodyText).length > 280) throw new PublishError("FAILED", "Shorten your X post and attached link to 280 characters.");
  if (platform === "facebook" && (!platformUserId || !/^\d+$/.test(platformUserId))) throw new PublishError("PERMISSION_REQUIRED", "Reconnect a Facebook Page before publishing.");
  let response: Response;
  try {
    response = await request(platform === "x" ? "https://api.x.com/2/tweets" : `https://graph.facebook.com/v26.0/${platformUserId}/feed`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": platform === "x" ? "application/json" : "application/x-www-form-urlencoded" },
      body: platform === "x" ? JSON.stringify({ text: bodyText }) : new URLSearchParams({ message: text, ...(mediaUrl ? { link: mediaUrl } : {}) }).toString(),
    });
  } catch { throw new PublishError("UNKNOWN", "The response was interrupted. Check your platform before creating another copy to avoid a duplicate post."); }
  if (!response.ok) {
    if (response.status >= 500 || response.status === 408) throw new PublishError("UNKNOWN", "The platform could not confirm delivery. Check your profile before posting a new copy.");
    if (response.status === 429) throw new PublishError("RATE_LIMITED", "The platform is limiting requests. Wait before trying again, or copy and open the platform.");
    if (response.status === 402) throw new PublishError("BILLING_REQUIRED", "Your platform API access requires credits. You can still copy and open the platform to post.");
    if ([401, 403].includes(response.status)) throw new PublishError("PERMISSION_REQUIRED", "Reconnect with publishing permission. X needs tweet.write; Facebook needs pages_manage_posts.");
    throw new PublishError("FAILED", "The platform rejected this post. Check its content and your app permissions before retrying.");
  }
  let id: unknown;
  try { const data = await response.json(); id = platform === "x" ? data.data?.id : data.id; }
  catch { throw new PublishError("UNKNOWN", "The platform accepted the request but its receipt could not be read. Check your profile."); }
  if (typeof id !== "string" || !/^\d+(?:_\d+)?$/.test(id)) throw new PublishError("UNKNOWN", "The platform did not return a usable receipt. Check your profile before reposting.");
  return { platformPostId: id, permalinkUrl: platform === "x" ? `https://x.com/i/status/${id}` : `https://www.facebook.com/${id}` };
}
