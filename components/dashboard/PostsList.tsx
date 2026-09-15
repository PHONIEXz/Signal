"use client";

import { useState } from "react";
import MeasurementHistory, { type MeasurementPoint } from "./MeasurementHistory";

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

export default function PostsList({ posts, platform }: { posts: Post[]; platform?: string }) {
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>(
    Object.fromEntries(posts.map((p) => [p.id, p.tags ?? ""]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);

  async function saveTags(id: string) {
    setSavingId(id);
    await fetch(`/api/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: tagDrafts[id] }),
    });
    setSavingId(null);
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
            <span>{post.likeCount === null ? `${platform === "facebook" ? "Reactions" : "Likes"} unavailable` : `${post.likeCount.toLocaleString()} ${platform === "facebook" ? "reactions" : "likes"}`}</span>
            <span>
              {post.viewCount === null
                ? "Views unavailable"
                : `${post.viewCount.toLocaleString()} views`}
            </span>
            <span>{post.replyCount === null ? "Replies unavailable" : `${post.replyCount.toLocaleString()} replies`}</span>
            <span>{post.retweetCount === null ? "Shares unavailable" : `${post.retweetCount.toLocaleString()} reposts`}</span>
            {post.quoteCount !== null && post.quoteCount > 0 && (
              <span>{post.quoteCount.toLocaleString()} quotes</span>
            )}
          </div>
          <p className="mt-3 text-xs text-ink-muted">Source: {post.measurements?.[0]?.source ?? "Unverified legacy"}. Measured: {post.measurements?.[0] ? new Date(post.measurements[0].capturedAt).toLocaleString("en-US") : "Unknown"}.</p>
          {post.measurements && post.measurements.length > 0 && <MeasurementHistory points={post.measurements} platform={platform} />}
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
              value={tagDrafts[post.id]}
              onChange={(e) =>
                setTagDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
              }
              onBlur={() => saveTags(post.id)}
              placeholder="Add tags, comma separated (e.g. promo, meme)"
              className="flex-1 rounded-md border border-border bg-paper px-3 py-1.5 text-xs text-ink placeholder:text-ink-muted/60 focus:border-navy"
            />
            {savingId === post.id && (
              <span className="text-xs text-ink-muted">Saving...</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
