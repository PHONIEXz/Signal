import Sidebar from "@/components/dashboard/Sidebar";
import UserMenu from "@/components/dashboard/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { auth } from "@/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-8 py-4">
          <h1 className="font-display text-lg font-medium text-ink">
            Overview
          </h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <UserMenu email={session?.user?.email} />
          </div>
        </header>
        <main className="flex-1 px-8 py-10">{children}</main>
      </div>
    </div>
  );
}

