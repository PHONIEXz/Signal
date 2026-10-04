import { creatorJson, CreatorApiError } from "./creator-platforms.ts";
import type { CollectedPost } from "./metric-measurements.ts";

export const RETENTION_COLUMNS = ["elapsedVideoTimeRatio", "audienceWatchRatio", "relativeRetentionPerformance"] as const;
export type RetentionPoint = { progress: number; watchRatio: number; relativePerformance: number };
export type VideoRetention = { videoId: string; title: string; url: string | null; points: RetentionPoint[] | null; warning: string | null };

export function validateRetention(data: unknown): RetentionPoint[] {
  const value = data as { columnHeaders?: { name?: string }[]; rows?: unknown[][] } | null;
  if (!Array.isArray(value?.columnHeaders) || value.columnHeaders.map(column => column?.name).join(",") !== RETENTION_COLUMNS.join(",")) {
    throw new CreatorApiError("YouTube returned unexpected retention columns. No substitute curve was created.");
  }
  const rows = value.rows ?? [];
  if (!Array.isArray(rows) || rows.length > 1000) throw new CreatorApiError("YouTube returned an unusable retention report.");
  let previous = -1;
  return rows.map(row => {
    if (!Array.isArray(row) || row.length !== 3 || row.some(cell => typeof cell !== "number" || !Number.isFinite(cell) || cell < 0 || cell > Number.MAX_SAFE_INTEGER)) {
      throw new CreatorApiError("YouTube returned unusable retention values.");
    }
    const [progress, watchRatio, relativePerformance] = row as number[];
    // Replays can make audienceWatchRatio greater than 1. Never clamp it.
    if (progress > 1 || progress <= previous || relativePerformance > 1) {
      throw new CreatorApiError("YouTube returned unexpected retention positions or comparison values.");
    }
    previous = progress;
    return { progress, watchRatio, relativePerformance };
  });
}

// Only pass videos verified as public and owned by the connected channel.
// IDs come from the server's collected upload playlist, never from request input.
export async function youtubeRetention(
  channelId: string,
  token: string,
  period: { startDate: string; endDate: string },
  videos: Pick<CollectedPost, "id" | "text" | "url">[],
  request: typeof fetch = fetch,
): Promise<VideoRetention[]> {
  const result: VideoRetention[] = [];
  const selected = videos.filter((video, index) => videos.findIndex(item => item.id === video.id) === index).slice(0, 3);
  for (const video of selected) {
    const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
    url.searchParams.set("ids", `channel==${channelId}`);
    url.searchParams.set("startDate", period.startDate);
    url.searchParams.set("endDate", period.endDate);
    url.searchParams.set("dimensions", "elapsedVideoTimeRatio");
    url.searchParams.set("metrics", "audienceWatchRatio,relativeRetentionPerformance");
    url.searchParams.set("filters", `video==${video.id}`);
    try {
      const points = validateRetention(await creatorJson(url, token, request));
      result.push({ videoId: video.id, title: video.text, url: video.url, points, warning: null });
    } catch (error) {
      const warning = error instanceof CreatorApiError ? error.message : "The retention report could not be reached.";
      result.push({ videoId: video.id, title: video.text, url: video.url, points: null, warning });
      if (error instanceof CreatorApiError && /quota|connection|denied access/.test(error.message)) break;
    }
  }
  return result;
}
