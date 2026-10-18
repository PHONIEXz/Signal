"use client";

import { metricTime } from "@/lib/metric-time";
import { useState } from "react";
import MeasurementHistory, {
  type MeasurementPoint,
} from "./MeasurementHistory";

type Post = {
  id: string;
  text: string;
  likeCount: number | null;
  viewCount: number | null;
  replyCount: number | null;
  retweetCount: number | null;
  quoteCount: number | null;
  tags: string | null;
  url: string | null;
  measurements?: MeasurementPoint[];
};

export default function PostsList({
  posts,
  platform,
}: {
  posts: Post[];
  platform?: string;
}) {
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>(
    Object.fromEntries(posts.map((p) => [p.id, p.tags ?? ""])),
  );
  const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});

  function postTags(id: string) {
    return posts.find((post) => post.id === id)?.tags ?? "";
  }

  async function saveTags(id: string) {
    setSaveStatus((current) => ({ ...current, [id]: "Saving…" }));
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: tagDrafts[id] ?? postTags(id) }),
      });
      if (!response.ok) throw new Error("Could not save tags. Try again.");
      setSaveStatus((current) => ({ ...current, [id]: "Saved" }));
    } catch {
      setSaveStatus((current) => ({
        ...current,
        [id]: "Could not save. Try again.",
      }));
    }
  }

  if (posts.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No posts recorded yet. Retrieve recent posts above or import a CSV.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="rounded-lg border border-border bg-surface p-5"
        >
          <p className="text-sm text-ink">{post.text}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
            <span>
              {post.likeCount === null
                ? `${platform === "facebook" ? "Reactions" : "Likes"} unavailable`
                : `${post.likeCount.toLocaleString()} ${platform === "facebook" ? "reactions" : "likes"}`}
            </span>
            <span>
              {post.viewCount === null
                ? "Views unavailable"
                : `${post.viewCount.toLocaleString()} views`}
            </span>
            <span>
              {post.replyCount === null
                ? "Replies unavailable"
                : `${post.replyCount.toLocaleString()} replies`}
            </span>
            <span>
              {post.retweetCount === null
                ? "Shares unavailable"
                : `${post.retweetCount.toLocaleString()} reposts`}
            </span>
            {post.quoteCount !== null && post.quoteCount > 0 && (
              <span>{post.quoteCount.toLocaleString()} quotes</span>
            )}
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            Source: {post.measurements?.[0]?.source ?? "Unverified legacy"}.
            Measured:{" "}
            {post.measurements?.[0]
              ? metricTime(post.measurements[0].capturedAt)
              : "Unknown"}
            .
          </p>
          {post.measurements && post.measurements.length > 0 && (
            <MeasurementHistory
              points={post.measurements}
              platform={platform}
            />
          )}
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-xs font-semibold text-navy hover:underline"
            >
              View original post ↗
            </a>
          )}
          <div className="mt-3 flex items-center gap-2">
            <input
              value={tagDrafts[post.id] ?? post.tags ?? ""}
              aria-label="Post tags"
              maxLength={500}
              disabled={saveStatus[post.id] === "Saving…"}
              onChange={(e) =>
                setTagDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
              }
              placeholder="Add tags, comma separated (e.g. promo, meme)"
              className="min-w-0 flex-1 rounded-md border border-border bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-navy"
            />
            <button
              type="button"
              onClick={() => saveTags(post.id)}
              disabled={saveStatus[post.id] === "Saving…"}
              className="min-h-11 rounded-lg border border-border px-3 text-sm font-semibold text-navy disabled:opacity-50"
            >
              Save tags
            </button>
          </div>
          <p role="status" className="mt-2 text-xs text-ink-muted">
            {saveStatus[post.id]}
          </p>
        </div>
      ))}
    </div>
  );
}
