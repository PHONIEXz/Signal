"use client";

import { COUNT_FIELDS, measurementDelta, type Counts } from "@/lib/metric-measurements";

export type MeasurementPoint = Counts & { source: string; capturedAt: string };
const display = (value: number | null | undefined) => value?.toLocaleString() ?? "Unavailable";

export default function MeasurementHistory({ points, platform }: { points: MeasurementPoint[]; platform?: string }) {
  const labels = {
    likeCount: platform === "facebook" ? "Reactions" : "Likes",
    viewCount: "Views",
    replyCount: platform === "facebook" ? "Comments" : "Replies",
    retweetCount: platform === "x" ? "Reposts" : "Shares",
    quoteCount: "Quotes",
  };
  const fields = COUNT_FIELDS.filter(field => platform === "x" || field !== "quoteCount");
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer font-medium text-navy">Measurement history ({points.length} latest points)</summary>
      <p className="mt-2 text-ink-muted">Counts are cumulative. Changes compare this same post and source; they are not a daily engagement report. CSV counts are user-supplied.</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">Post measurements and changes from earlier measurements of the same source</caption>
          <thead><tr><th scope="col" className="p-2">Measured / source</th>{fields.map(field => <th scope="col" className="p-2" key={field}>{labels[field]} / change</th>)}</tr></thead>
          <tbody>
            {points.map((point, index) => {
              const previous = points.slice(index + 1).find(candidate => candidate.source === point.source);
              const delta = measurementDelta(
                { ...point, capturedAt: new Date(point.capturedAt) },
                previous ? { ...previous, capturedAt: new Date(previous.capturedAt) } : undefined
              );
              return (
                <tr className="border-t border-border" key={`${point.source}-${point.capturedAt}-${index}`}>
                  <td className="whitespace-nowrap p-2">{new Date(point.capturedAt).toLocaleString("en-US")} / {point.source}</td>
                  {fields.map(field => (
                    <td className="whitespace-nowrap p-2" key={field}>
                      {display(point[field])}
                      <span className="mt-1 block text-ink-muted">Change: {delta?.[field] === null || delta?.[field] === undefined ? "Unavailable" : `${delta[field] > 0 ? "+" : ""}${display(delta[field])}`}</span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
