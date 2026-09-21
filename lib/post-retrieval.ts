import { facebookApiErrorCode, facebookPostsWarning, type FacebookPostPayload } from "./platform-data.ts";

export function xPostsWarning(status: number) {
  if (status === 402) return "X post retrieval requires API credits in the X Developer Console. Connecting your account does not include post-reading credits.";
  if (status === 401) return "X rejected the token. Reconnect X before retrieving posts.";
  if (status === 403) return "X post reading is not authorized. Check the app's read access and reconnect to grant tweet.read and users.read.";
  if (status === 429) return "X temporarily rate limited post retrieval. Try again later.";
  return "X could not return recent posts. Your previously retrieved posts are preserved; try again later.";
}

export async function retrieveFacebookPosts(pageId: string, token: string, limit: number, fetcher: typeof fetch = fetch) {
  const request = async (rich: boolean) => {
    const url = new URL(`https://graph.facebook.com/v26.0/${pageId}/posts`);
    url.searchParams.set("fields", rich ? "id,message,created_time,permalink_url,reactions.limit(0).summary(true),comments.limit(0).summary(true),shares" : "id,message,created_time,permalink_url");
    url.searchParams.set("limit", String(limit));
    const response = await fetcher(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
    const payload = await response.json().catch(() => null);
    return { response, payload };
  };
  try {
    let result = await request(true);
    let contentOnly = false;
    const initialCode = facebookApiErrorCode(result.payload);
    // Retry only field/permission errors; never repeatedly hit a rate-limited API.
    if (!result.response.ok && [10, 100, 200].includes(initialCode ?? -1)) {
      result = await request(false);
      contentOnly = true;
    }
    if (!result.response.ok) return { posts: null, contentOnly: false, warning: facebookPostsWarning(facebookApiErrorCode(result.payload)) };
    if (!Array.isArray(result.payload?.data) || result.payload.data.some((post: unknown) => !post || typeof post !== "object" || typeof (post as { id?: unknown }).id !== "string")) {
      return { posts: null, contentOnly: false, warning: "Meta returned an unexpected post response. Previously retrieved posts were preserved." };
    }
    const posts = result.payload.data as FacebookPostPayload[];
    contentOnly ||= posts.some(post => typeof post.reactions?.summary?.total_count !== "number" || typeof post.comments?.summary?.total_count !== "number");
    return { posts, contentOnly, warning: contentOnly ? "Facebook post content was retrieved, but engagement fields were not returned. Reactions and comments are unavailable, not zero." : null };
  } catch {
    return { posts: null, contentOnly: false, warning: "Facebook post retrieval timed out or could not reach Meta. Previously retrieved posts were preserved." };
  }
}
