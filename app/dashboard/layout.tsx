import Link from "next/link";
import { isAdmin } from "@/lib/service-config";
import Sidebar from "@/components/dashboard/Sidebar";
import UserMenu from "@/components/dashboard/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import BrandMark from "@/components/BrandMark";
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
    <div className="min-h-screen bg-paper">
      <a href="#dashboard-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-surface focus:p-3">Skip to content</a>
      <Sidebar />

      <div className="min-h-screen sm:pl-64">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-border/80 bg-surface/[0.82] px-4 backdrop-blur-xl sm:px-7 lg:px-10">
          <BrandMark compact className="sm:hidden" />

          <div className="hidden sm:block">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Signal workspace
            </p>
            <p className="mt-1 text-sm font-medium text-ink">
              Your social command center
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard/queue" className="text-xs font-medium text-navy">Queue & updates</Link>
            <ThemeToggle />
            <UserMenu email={session.user.email} />
          </div>
        </header>

        <main id="dashboard-content" tabIndex={-1} className="animate-rise-in px-4 py-7 pb-28 sm:px-7 sm:py-9 sm:pb-10 lg:px-10 lg:py-11">
          {children}
        </main>
        <footer className="border-t border-border/70 px-4 py-7 pb-28 sm:px-7 sm:pb-7 lg:px-10">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-ink-muted">© {new Date().getFullYear()} Signal</p>
            <div className="flex flex-wrap gap-4"><Link href="/dashboard/get-started" className="text-xs text-ink-muted">Get started</Link><Link href="/dashboard/usage" className="text-xs text-ink-muted">Usage</Link>{isAdmin(session.user.id) && <Link href="/dashboard/operations" className="text-xs text-ink-muted">Operations</Link>}<LegalLinks /></div>
          </div>
        </footer>
      </div>
    </div>
  );
}
