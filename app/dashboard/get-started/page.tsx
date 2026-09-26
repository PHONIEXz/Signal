import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import PageIntro from "@/components/dashboard/PageIntro";
export default async function GetStartedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const [connections, posts, drafts] = await Promise.all([
    prisma.connectedAccount.count({ where: { userId } }),
    prisma.post.count({ where: { connectedAccount: { userId } } }),
    prisma.contentDraft.count({ where: { userId } }),
  ]);
  const steps = [
    { title: "Connect your first account", done: connections > 0, href: "/dashboard/accounts", text: "Choose the profile or Facebook Page you want to manage." },
    { title: "Collect your first posts", done: posts > 0, href: "/dashboard/accounts", text: "Open the connected account and refresh. Available metrics depend on the platform and permissions." },
    { title: "Create a draft", done: drafts > 0, href: "/dashboard/content", text: "Write an idea, choose an account and save it. Planned dates are reminders; publishing remains manual." },
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageIntro eyebrow="Workspace / First steps" title="Get started with Signal" description="Three useful steps to turn your connected channels into a working routine." aside={<span className="text-sm text-ink-muted">{steps.filter((step) => step.done).length} of 3 complete</span>} />
      <div className="border-t border-border">
        {steps.map((step, index) => (
          <Link key={step.title} href={step.href} className="interactive-card grid gap-4 border-b border-border px-2 py-6 sm:grid-cols-[5rem_1fr_auto] sm:items-center sm:gap-6">
            <span className="section-index">0{index + 1}</span>
            <div><h2 className="font-display text-2xl font-medium text-ink">{step.title}</h2><p className="mt-2 text-sm leading-6 text-ink-muted">{step.text}</p></div>
            <span className={`text-xs font-semibold ${step.done ? "text-connected" : "text-navy"}`}>{step.done ? "Completed ✓" : "Open step ↗"}</span>
          </Link>
        ))}
      </div>
      <Link href="/dashboard/usage" className="inline-flex text-sm font-semibold text-navy underline underline-offset-4">View your usage allowance</Link>
    </div>
  );
}
