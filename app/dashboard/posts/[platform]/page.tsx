import { attachMeasurementEvidence } from "@/lib/measurement-evidence";
import SyncDetails from "@/components/dashboard/SyncDetails";
import MetricsImport from "@/components/dashboard/MetricsImport";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PostsList from "@/components/dashboard/PostsList";
import InsightsChat from "@/components/dashboard/InsightsChat";
import PostsRefresh from "@/components/dashboard/PostsRefresh";
import PageIntro from "@/components/dashboard/PageIntro";

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

  const storedPosts = await prisma.post.findMany({
    where: {
      connectedAccountId: connectedAccount.id,
    },
    orderBy: {
      postedAt: "desc",
    },
    take: 50,
  });
  const posts = await attachMeasurementEvidence(storedPosts);
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

        <div className="mt-5"><PageIntro eyebrow="Workspace / Content" title={`${platformLabel} posts`} description={`${posts.length} recent posts from this connected account.`} /></div>
      </div>

      <PostsRefresh platform={platform} />
      <SyncDetails accountId={connectedAccount.id} />
      <MetricsImport platform={platform} />
      {contentOnly && <p className="text-sm text-ink-muted">Post content is available. Engagement counts could not be retrieved and are shown as unavailable.</p>}
      <PostsList platform={platform}
        posts={posts.map((p) => ({
          id: p.id,
          measurements: p.measurements.map(m => ({ likeCount:m.likeCount,viewCount:m.viewCount,replyCount:m.replyCount,retweetCount:m.retweetCount,quoteCount:m.quoteCount,source:m.source,capturedAt:m.capturedAt.toISOString() })),
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
