"use client";

import { useState } from "react";

type Post = {
  id: string;
  text: string;
  likeCount: number;
  viewCount: number;
  replyCount: number;
  retweetCount: number;
  tags: string | null;
};

export default function PostsList({ posts }: { posts: Post[] }) {
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
        No posts recorded yet — click Refresh on the Overview page to pull
        your recent posts.
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
            <span>{post.likeCount.toLocaleString()} likes</span>
            <span>{post.viewCount.toLocaleString()} views</span>
            <span>{post.replyCount.toLocaleString()} replies</span>
            <span>{post.retweetCount.toLocaleString()} reposts</span>
          </div>
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

