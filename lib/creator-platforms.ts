import { measured, metricDate, type CollectedPost } from "./metric-measurements.ts";
export type CreatorPlatform = "instagram" | "youtube";
export function creatorConfigured(platform: CreatorPlatform, env: Record<string, string | undefined> = process.env) {
    return platform === "instagram"
        ? !!(env.FACEBOOK_APP_ID?.trim() && env.FACEBOOK_APP_SECRET?.trim() && env.INSTAGRAM_FACEBOOK_CONFIG_ID?.trim())
        : !!(env.YOUTUBE_CLIENT_ID?.trim() && env.YOUTUBE_CLIENT_SECRET?.trim());
}
export class CreatorApiError extends Error {
    constructor(message: string) { super(message); }
}
export async function creatorJson(url: URL | string, token: string, request: typeof fetch = fetch) {
    const response = await request(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000) }).catch(()=>{throw new CreatorApiError("The platform could not be reached. Try again later.");});
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.error) {
        const reasons = (Array.isArray(data?.error?.errors) ? data.error.errors : []).map((e: {
            reason?: string;
        }) => e?.reason);
        if (reasons.includes("quotaExceeded") || reasons.includes("dailyLimitExceeded"))
            throw new CreatorApiError("YouTube's API quota has been reached. Keep saved data and retry after the quota resets; this is not an X-style credit purchase.");
        if (response.status === 401 || data?.error?.code === 190)
            throw new CreatorApiError("The platform rejected this connection. Reauthorize the original account.");
        if (response.status === 403 || [10, 200].includes(data?.error?.code))
            throw new CreatorApiError("The platform denied access. Check approved scopes, account ownership and application review status.");
        if (response.status === 429 || [4, 17, 613].includes(data?.error?.code))
            throw new CreatorApiError("The platform rate limited collection. Try again later; saved data was preserved.");
        throw new CreatorApiError("The platform request or response needs review. Saved data was preserved.");
    }
    return data;
}
export function decimalCount(value: unknown) {
    // YouTube encodes counts as decimal strings. Never accept negatives or floats.
    const number = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
    return typeof number === "number" && Number.isSafeInteger(number) && number >= 0 ? number : null;
}
export async function creatorProfile(platform: CreatorPlatform, id: string, token: string, request: typeof fetch = fetch) {
    if (platform === "instagram") {
        const url = new URL(`https://graph.facebook.com/v26.0/${id}`);
        url.searchParams.set("fields", "id,username,followers_count,follows_count,media_count");
        const data = await creatorJson(url, token, request);
        if (data?.id !== id)
            throw new CreatorApiError("The connected Instagram identity did not match. Reauthorize the original account.");
        return { id, name: typeof data.username === "string" ? data.username : "Instagram", followers: measured(data.followers_count), following: measured(data.follows_count), totalPosts: measured(data.media_count), uploads: null };
    }
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "snippet,statistics,contentDetails");
    url.searchParams.set("id", id);
    const data = await creatorJson(url, token, request);
    const channel = (Array.isArray(data?.items) ? data.items : []).find((item: {
        id: string;
    }) => item.id === id);
    if (!channel)
        throw new CreatorApiError("The connected YouTube channel was not returned. Check channel access.");
    return { id, name: typeof channel.snippet?.title === "string" ? channel.snippet.title : "YouTube", followers: channel.statistics?.hiddenSubscriberCount ? null : decimalCount(channel.statistics?.subscriberCount), following: null, totalPosts: decimalCount(channel.statistics?.videoCount), uploads: channel.contentDetails?.relatedPlaylists?.uploads ?? null };
}
function instagramPermalink(value:unknown):string|null {
    if(typeof value!=="string") return null;
    try { const url=new URL(value); return url.protocol==="https:" && ["instagram.com","www.instagram.com"].includes(url.hostname) ? url.href : null; } catch { return null; }
}
export async function creatorPosts(platform: CreatorPlatform, id: string, token: string, limit: number, uploads?: string | null, request: typeof fetch = fetch) {
    const posts: CollectedPost[] = [];
    let cursor: string | undefined;
    const cursors = new Set<string>();
    let requests = 0;
    try {
        while (posts.length < limit && requests < (platform === "youtube" ? 9 : 10)) {
            const url = new URL(platform === "instagram" ? `https://graph.facebook.com/v26.0/${id}/media` : "https://www.googleapis.com/youtube/v3/playlistItems");
            if (platform === "instagram") {
                url.searchParams.set("fields", "id,caption,permalink,timestamp,like_count,comments_count,media_type");
                url.searchParams.set("limit", String(Math.min(50, limit - posts.length)));
                if (cursor)
                    url.searchParams.set("after", cursor);
            }
            else {
                if (!uploads)
                    throw new CreatorApiError("YouTube did not return the channel's upload playlist.");
                url.searchParams.set("part", "contentDetails");
                url.searchParams.set("playlistId", uploads);
                url.searchParams.set("maxResults", String(Math.min(50, limit - posts.length)));
                if (cursor)
                    url.searchParams.set("pageToken", cursor);
            }
            requests++;
            const data = await creatorJson(url, token, request);
            let items = data?.data;
            if (platform === "youtube") {
                if (!Array.isArray(data?.items))
                    throw new CreatorApiError("YouTube returned an unexpected upload list.");
                const ids = data.items.map((item: {
                    contentDetails?: {
                        videoId?: string;
                    };
                }) => item.contentDetails?.videoId).filter((value: unknown): value is string => typeof value === "string");
                if (ids.length !== data.items.length)
                    throw new CreatorApiError("YouTube omitted a video identifier.");
                if (ids.length) {
                    const videos = new URL("https://www.googleapis.com/youtube/v3/videos");
                    videos.searchParams.set("part", "snippet,statistics,status");
                    videos.searchParams.set("id", ids.join(","));
                    requests++;
                    const details = await creatorJson(videos, token, request);
                    if (!Array.isArray(details?.items))
                        throw new CreatorApiError("YouTube returned unexpected video counters.");
                    if (details.items.some((video: {
                        id?: string;
                        snippet?: {
                            channelId?: string;
                        };
                    }) => typeof video.id !== "string" || !ids.includes(video.id) || video.snippet?.channelId !== id))
                        throw new CreatorApiError("YouTube video ownership could not be verified.");
                    items = details.items.filter((video: {
                        status?: {
                            privacyStatus?: string;
                        };
                    }) => video.status?.privacyStatus === "public");
                }
                else
                    items = [];
            }
            if (!Array.isArray(items) || items.some(p => typeof p?.id !== "string"))
                throw new CreatorApiError("The platform returned an unexpected media list.");
            for (const p of items) {
                if (posts.some(post => post.id === p.id))
                    continue;
                posts.push({ id: p.id, text: platform === "instagram" ? typeof p.caption === "string" ? p.caption : "(No caption)" : typeof p.snippet?.title === "string" ? p.snippet.title : "(No title)", url: platform === "instagram" ? instagramPermalink(p.permalink) : `https://www.youtube.com/watch?v=${encodeURIComponent(p.id)}`, postedAt: metricDate(platform === "instagram" ? p.timestamp : p.snippet?.publishedAt), likeCount: platform === "instagram" ? measured(p.like_count) : decimalCount(p.statistics?.likeCount), replyCount: platform === "instagram" ? measured(p.comments_count) : decimalCount(p.statistics?.commentCount), viewCount: platform === "instagram" ? null : decimalCount(p.statistics?.viewCount), retweetCount: null, quoteCount: null });
                if (posts.length >= limit)
                    break;
            }
            const next = platform === "instagram" ? data?.paging?.next ? data.paging?.cursors?.after : undefined : data?.nextPageToken;
            if (!next)
                return { posts, complete: true, warning: platform === "instagram" ? "Basic media counters collected. Reach, views, saves and shares require separately approved Instagram Insights reports." : "Video counters are cumulative. Channel analytics use separate date-range reports; subscribers may be rounded or hidden.", requests };
            if (typeof next !== "string" || cursors.has(next) || (platform === "instagram" ? !items.length : !data.items.length))
                throw new CreatorApiError("Collection stopped because media pagination did not advance.");
            cursors.add(next);
            cursor = next;
        }
        return { posts, complete: posts.length >= limit, warning: platform === "instagram" ? "Basic media counters only. Reach, views, saves and shares are not included in this collection." : "Only public video counters are shown; counts are cumulative and subscribers may be rounded or hidden.", requests };
    }
    catch (error) {
        return { posts, complete: false, warning: error instanceof CreatorApiError ? error.message : "The platform could not be reached. Saved measurements were preserved.", requests };
    }
}
