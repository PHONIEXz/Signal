import WorkspaceHeader from "@/components/dashboard/WorkspaceHeader";
import MotionScene from "@/components/motion/MotionScene";
import Link from "next/link";
import { isAdmin } from "@/lib/service-config";
import Sidebar from "@/components/dashboard/Sidebar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LegalLinks from "@/components/LegalLinks";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="workspace-shell min-h-screen bg-paper">
      <a href="#dashboard-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-surface focus:p-3">Skip to content</a>
      <Sidebar />

      <div className="min-h-screen lg:pl-60">
        <WorkspaceHeader email={session.user.email} initialTime={new Date().toISOString()} />

        <main id="dashboard-content" tabIndex={-1} className="workspace-content px-4 py-6 pb-28 sm:px-7 sm:py-8 lg:pb-10 lg:px-8">
          <MotionScene>{children}</MotionScene>
        </main>
        <footer className="border-t border-border/70 px-4 py-7 pb-28 sm:px-7 lg:pb-7 lg:px-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-ink-muted">© {new Date().getFullYear()} SocialPanora</p>
            <div className="flex flex-wrap gap-4"><Link href="/dashboard/get-started" className="text-xs text-ink-muted">Get started</Link><Link href="/dashboard/usage" className="text-xs text-ink-muted">Usage</Link>{isAdmin(session.user.id) && <Link href="/dashboard/operations" className="text-xs text-ink-muted">Operations</Link>}<LegalLinks /></div>
          </div>
        </footer>
      </div>
    </div>
  );
}
