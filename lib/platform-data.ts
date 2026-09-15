export type FacebookPostPayload = {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  shares?: { count?: number };
};

export function profileImageUrl(
  platform: string,
  payload: unknown
): string | null {
  if (!payload || typeof payload !== "object") return null;

  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;

  let candidate: unknown;
  if (platform === "facebook") {
    candidate = (data as { url?: unknown }).url;
  } else if (platform === "x") {
    candidate = (data as { profile_image_url?: unknown }).profile_image_url;
  } else if (platform === "tiktok") {
    const user = (data as { user?: unknown }).user;
    candidate =
      user && typeof user === "object"
        ? (user as { avatar_url?: unknown }).avatar_url
        : null;
  }

  if (typeof candidate !== "string") return null;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function facebookApiErrorCode(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== "object") return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "number" ? code : null;
}

export function facebookPostsWarning(errorCode: number | null): string {
  if (errorCode === 190) {
    return "Facebook account metrics were updated, but the Page token is no longer valid. Reconnect Facebook to retrieve posts.";
  }

  if (errorCode === 4 || errorCode === 17 || errorCode === 32) {
    return "Facebook account metrics were updated, but Meta temporarily rate limited recent posts. Try refreshing later.";
  }

  if (errorCode === 10 || errorCode === 200) {
    return "Facebook account metrics were updated, but recent posts need pages_read_engagement access and full control of the Page.";
  }

  return "Facebook account metrics were updated, but Meta did not return recent Page posts.";
}

export function normalizeFacebookPost(post: FacebookPostPayload) {
  const likeCount = post.reactions?.summary?.total_count ?? 0;
  const replyCount = post.comments?.summary?.total_count ?? 0;
  const shareCount = post.shares?.count ?? 0;

  return {
    id: post.id,
    text: post.message ?? "(No text)",
    url: post.permalink_url ?? null,
    likeCount,
    replyCount,
    shareCount,
    engagementCount: likeCount + replyCount + shareCount,
    postedAt: post.created_time ? new Date(post.created_time) : null,
  };
}
