import { youtubeRetention } from "./youtube-retention.ts";
import type { CollectedPost } from "./metric-measurements.ts";
import { creatorJson, CreatorApiError } from "./creator-platforms.ts";
export const YOUTUBE_REPORTS = {
    overview: { metrics: "views,engagedViews,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained,subscribersLost", dimensions: "" },
    daily: { metrics: "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage", dimensions: "day" },
    traffic: { metrics: "views,estimatedMinutesWatched", dimensions: "insightTrafficSourceType" },
    countries: { metrics: "views,estimatedMinutesWatched,averageViewDuration", dimensions: "country" },
    viewers: { metrics: "views,estimatedMinutesWatched,averageViewDuration", dimensions: "subscribedStatus" },
    formats: { metrics: "views,estimatedMinutesWatched,averageViewDuration", dimensions: "creatorContentType" },
} as const;
export type YouTubeReport = {
    columns: string[];
    rows: (string | number)[][];
};
export function reportPeriod(days: 7 | 28 | 90, now = new Date()) {
    // Analytics reporting days follow America/Los_Angeles. Leave three days for processing.
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const part = (type: string) => parts.find(p => p.type === type)!.value;
    const end = new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() - 3);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days + 1);
    return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), timeZone: "America/Los_Angeles" };
}
export function validateReport(data: unknown, columns: string[]): YouTubeReport {
    const value = data as {
        columnHeaders?: {
            name?: string;
        }[];
        rows?: unknown[][];
    } | null;
    if (!Array.isArray(value?.columnHeaders) || value.columnHeaders.map(c => c?.name).join(",") !== columns.join(","))
        throw new CreatorApiError("YouTube returned unexpected report columns. No substitute values were used.");
    // An omitted rows array is the API's empty-report response, not measured zeros.
    const rows = value.rows ?? [];
    if (!Array.isArray(rows) || rows.length > 1000 || rows.some(row => !Array.isArray(row) || row.length !== columns.length || row.some((cell,index) => { const name=columns[index]; if (["day","insightTrafficSourceType","country","subscribedStatus","creatorContentType"].includes(name)) return typeof cell!=="string" || cell.length>200; return typeof cell!=="number" || !Number.isFinite(cell) || cell<0 || cell>Number.MAX_SAFE_INTEGER || (!["estimatedMinutesWatched","averageViewDuration","averageViewPercentage"].includes(name) && !Number.isSafeInteger(cell)); })))
        throw new CreatorApiError("YouTube returned an unusable analytics report.");
    return { columns, rows: rows as (string | number)[][] };
}
export async function youtubeReports(channelId: string, token: string, days: 7 | 28 | 90, request: typeof fetch = fetch, videos:CollectedPost[] = []) {
    const period = reportPeriod(days);
    const reports: Partial<Record<keyof typeof YOUTUBE_REPORTS, YouTubeReport>> = {};
    const warnings: string[] = [];
    let blocked=false;
    // Separate supported reports; one unavailable breakdown must not erase the others.
    for (const [key, definition] of Object.entries(YOUTUBE_REPORTS)) {
        const url = new URL("https://youtubeanalytics.googleapis.com/v2/reports");
        url.searchParams.set("ids", `channel==${channelId}`);
        url.searchParams.set("startDate", period.startDate);
        url.searchParams.set("endDate", period.endDate);
        url.searchParams.set("metrics", definition.metrics);
        if (definition.dimensions)
            url.searchParams.set("dimensions", definition.dimensions);
        try {
            reports[key as keyof typeof YOUTUBE_REPORTS] = validateReport(await creatorJson(url, token, request), [...definition.dimensions ? definition.dimensions.split(",") : [], ...definition.metrics.split(",")]);
        }
        catch (error) {
            warnings.push(`${key}: ${error instanceof CreatorApiError ? error.message : "The analytics report could not be reached."}`);
            if (error instanceof CreatorApiError && /quota|connection|denied access/.test(error.message)) {
                blocked=true;
                break;
            }
        }
    }
    const retention=blocked?[]:await youtubeRetention(channelId,token,period,videos,request);
    return { period, reports, warnings, retention };
}
