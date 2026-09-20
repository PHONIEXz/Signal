type Post = {
  text: string;
  likeCount: number | null;
  viewCount: number | null;
  replyCount: number | null;
  retweetCount: number | null;
  quoteCount: number | null;
  url: string;
};

export default function TopPost({ post, platform }: { post: Post | null; platform?: string }) {
  if (!post) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <p className="font-display text-lg font-medium text-ink">Top post</p>
      <p className="mt-3 line-clamp-3 text-sm text-ink">{post.text}</p>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-muted">
        <span>{post.likeCount === null ? "Unavailable" : post.likeCount.toLocaleString()} {platform === "facebook" ? "reactions" : "likes"}</span>
        <span>
          {post.viewCount === null
            ? "Views unavailable"
            : `${post.viewCount.toLocaleString()} views`}
        </span>
        <span>{post.replyCount === null ? "Unavailable" : post.replyCount.toLocaleString()} replies</span>
        <span>{post.retweetCount === null ? "Unavailable" : post.retweetCount.toLocaleString()} reposts</span>
        {post.quoteCount !== null && post.quoteCount > 0 && (
          <span>{post.quoteCount.toLocaleString()} quotes</span>
        )}
      </div>
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-sm font-medium text-navy hover:underline"
      >
        View post →
      </a>
    </div>
  );
}
