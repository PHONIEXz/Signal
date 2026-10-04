"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { VideoRetention } from "@/lib/youtube-retention";

export default function YouTubeRetention({ videos }: { videos: VideoRetention[] }) {
  return (
    <section className="surface-card p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Video retention</h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        Official curves for up to three recent public videos, using the channel report’s date range.
        Video progress runs from 0 (start) to 1 (end). A watch ratio of 0.5 means that section was
        watched half as often as the video’s total views. Replays can push the ratio above 1.
      </p>
      <p className="mt-2 text-xs leading-5 text-ink-muted">
        YouTube’s relative performance compares retention with videos of similar length:
        0.5 is the middle of that comparison. It is a separate measure from the watch ratio.
        Signal displays YouTube’s reported points and does not create a retention score.
      </p>
      <div className="mt-5 space-y-6">
        {videos.map(video => (
          <article key={video.videoId} className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-ink">
              {video.url ? <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-navy underline">{video.title}</a> : video.title}
            </h3>
            {video.warning ? (
              <p role="status" className="mt-2 text-sm text-ink-muted">{video.warning}</p>
            ) : video.points?.length ? (
              <>
                <div className="mt-4 h-64" role="img" aria-label={`Official retention chart for ${video.title}. Exact reported values are available in the table below.`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={video.points} margin={{ top: 10, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
                      <XAxis dataKey="progress" type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, "auto"]} tick={{ fontSize: 11 }} width={40} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="linear" dataKey="watchRatio" name="Watch ratio" stroke="#203D67" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                      <Line type="linear" dataKey="relativePerformance" name="Relative performance" stroke="#B27B29" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <details className="mt-3 text-xs text-ink-muted">
                  <summary className="cursor-pointer font-semibold">View reported values</summary>
                  <div className="mt-2 max-h-64 overflow-auto">
                    <table className="w-full text-left">
                      <caption className="sr-only">YouTube retention points for {video.title}</caption>
                      <thead><tr>{["Video progress (ratio)", "Watch ratio", "Relative performance"].map(label => <th key={label} scope="col" className="border-b border-border p-2">{label}</th>)}</tr></thead>
                      <tbody>{video.points.map(point => <tr key={point.progress}><td className="p-2">{point.progress}</td><td className="p-2">{point.watchRatio}</td><td className="p-2">{point.relativePerformance}</td></tr>)}</tbody>
                    </table>
                  </div>
                </details>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No retention rows were returned. This does not mean zero retention; data may be delayed or unavailable for this video.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
