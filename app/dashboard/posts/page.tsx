import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const PLATFORM_LABELS: Record<string, string> = {
  x: "X",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export default async function PostsPage() {
  const session = await auth();

  const connections = session?.user?.id
    ? await prisma.connectedAccount.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        include: {
          posts: {
            orderBy: { postedAt: "desc" },
            take: 10,
          },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy">
          Content
        </p>

        <h1 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">
          Posts
        </h1>

        <p className="mt-2 text-sm text-ink-muted">
          Browse recent content from your connected platforms.
        </p>
      </div>

      {connections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-8 py-16 text-center">
          <p className="font-display text-xl font-medium text-ink">
            No platforms connected
          </p>

          <p className="mt-2 text-sm text-ink-muted">
            Connect a social account to start collecting your posts.
          </p>

          <Link
            href="/dashboard/accounts"
            className="mt-5 inline-flex rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Connect an account
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => {
            const label =
              PLATFORM_LABELS[connection.platform] ??
              connection.platform.charAt(0).toUpperCase() +
                connection.platform.slice(1);

            return (
              <Link
                key={connection.id}
                href={`/dashboard/posts/${connection.platform}`}
                className="group rounded-xl border border-border bg-surface p-6 transition-colors hover:border-navy/30 hover:bg-paper"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span
                        className="h-2.5 w-2.5 rounded-full bg-connected"
                        aria-hidden="true"
                      />

                      <h2 className="font-display text-lg font-medium text-ink">
                        {label}
                      </h2>
                    </div>

                    <p className="mt-2 text-sm text-ink-muted">
                      {connection.posts.length === 0
                        ? "No posts recorded yet."
                        : `${connection.posts.length} recent posts available.`}
                    </p>
                  </div>

                  <span className="text-sm font-medium text-navy transition-transform group-hover:translate-x-1">
                    View posts →
                  </span>
                </div>

                {connection.posts.length > 0 && (
                  <div className="mt-5 border-t border-border pt-4">
                    <p className="line-clamp-2 text-sm text-ink">
                      {connection.posts[0].text}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
                      <span>
                        {connection.posts[0].likeCount.toLocaleString()} likes
                      </span>

                      <span>
                        {connection.platform === "facebook"
                          ? "Views unavailable"
                          : `${connection.posts[0].viewCount.toLocaleString()} views`}
                      </span>

                      <span>
                        {connection.posts[0].replyCount.toLocaleString()} replies
                      </span>

                      <span>
                        {connection.posts[0].retweetCount.toLocaleString()} reposts
                      </span>

                      {connection.posts[0].quoteCount > 0 && (
                        <span>
                          {connection.posts[0].quoteCount.toLocaleString()} quotes
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
