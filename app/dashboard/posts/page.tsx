import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PostsList from "@/components/dashboard/PostsList";

export default async function PostsPage() {
  const session = await auth();

  const connectedAccount = session?.user?.id
    ? await prisma.connectedAccount.findUnique({
        where: { userId_platform: { userId: session.user.id, platform: "x" } },
      })
    : null;

  const posts = connectedAccount
    ? await prisma.post.findMany({
        where: { connectedAccountId: connectedAccount.id },
        orderBy: { postedAt: "desc" },
      })
    : [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 font-display text-lg font-medium text-ink">Posts</h1>
      <PostsList
        posts={posts.map((p) => ({
          id: p.id,
          text: p.text,
          likeCount: p.likeCount,
          viewCount: p.viewCount,
          replyCount: p.replyCount,
          retweetCount: p.retweetCount,
          tags: p.tags,
        }))}
      />
    </div>
  );
}

