import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PostsList from "@/components/dashboard/PostsList";
import InsightsChat from "@/components/dashboard/InsightsChat";
import PostsRefresh from "@/components/dashboard/PostsRefresh";

const PLATFORM_LABELS: Record<string, string> = {
  x: "X",
  tiktok: "TikTok",
  facebook: "Facebook",
};

export default async function PlatformPostsPage({
  params,
}: {
  params: Promise<{ platform: string }>;
}) {
  const { platform } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  const connectedAccount = await prisma.connectedAccount.findUnique({
    where: {
      userId_platform: {
        userId: session.user.id,
        platform,
      },
    },
  });

  if (!connectedAccount) {
    notFound();
  }

  const posts = await prisma.post.findMany({
    where: {
      connectedAccountId: connectedAccount.id,
    },
    orderBy: {
      postedAt: "desc",
    },
    take: 50,
  });
  const snapshot = await prisma.metricSnapshot.findFirst({ where: { connectedAccountId: connectedAccount.id }, orderBy: { fetchedAt: "desc" } });
  const contentOnly = snapshot?.postMetricsStatus === "CONTENT_ONLY";

  const platformLabel =
    PLATFORM_LABELS[platform] ?? platform;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/dashboard/posts"
          className="text-sm text-ink-muted hover:text-ink"
        >
          ← Back to platforms
        </Link>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-medium capitalize text-ink">
              {platformLabel} Posts
            </h1>

            <p className="mt-1 text-sm text-ink-muted">
              {posts.length} recent posts
            </p>
          </div>
        </div>
      </div>

      <PostsRefresh platform={platform} />
      {contentOnly && <p className="text-sm text-ink-muted">Post content is available. Engagement counts could not be retrieved and are shown as unavailable.</p>}
      <PostsList
        posts={posts.map((p) => ({
          id: p.id,
          text: p.text,
          likeCount: contentOnly ? null : p.likeCount,
          viewCount: platform === "facebook" ? null : p.viewCount,
          replyCount: contentOnly ? null : p.replyCount,
          retweetCount: contentOnly ? null : p.retweetCount,
          quoteCount: contentOnly ? null : p.quoteCount,
          tags: p.tags,
          url: p.permalinkUrl ?? p.url,
        }))}
      />

      <InsightsChat platform={platform} />
    </div>
  );
}
