"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import BrandMark from "@/components/BrandMark";
import UserMenu from "./UserMenu";
import WorkspaceClock from "./WorkspaceClock";

const destinations = [
  ["Overview", "/dashboard"], ["Posts", "/dashboard/posts"],
  ["Content Studio", "/dashboard/content"], ["Accounts", "/dashboard/accounts"],
  ["Insights", "/dashboard/insights"], ["Reports", "/dashboard/reports"],
  ["Settings", "/dashboard/settings"], ["Usage", "/dashboard/usage"],
  ["Get started", "/dashboard/get-started"],
];
export default function WorkspaceHeader({email,initialTime}:{email?:string|null;initialTime:string}) {
  const pathname = usePathname();
  const [query,setQuery] = useState("");
  const title = destinations.find(([,href])=>href!=="/dashboard" && (pathname===href || pathname.startsWith(href+"/")))?.[0] ?? "Overview";
  const matches = query.trim() ? destinations.filter(([name])=>name.toLowerCase().includes(query.trim().toLowerCase())) : [];
  return <header className="workspace-header sticky top-0 z-30 flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-7 lg:px-8">
    <div className="flex items-center gap-4"><BrandMark compact className="lg:hidden" /><div><p className="text-sm font-semibold text-ink"><span className="hidden font-medium text-ink-muted sm:inline">Workspace <span className="mx-2 text-ink-muted/40">/</span></span>{title}</p><div className="mt-1 hidden sm:block"><WorkspaceClock initialTime={initialTime}/></div></div></div>
    <div className="flex items-center gap-3">
      <div className="relative hidden md:block"><label className="sr-only" htmlFor="workspace-search">Find a workspace page</label><input id="workspace-search" type="search" autoComplete="off" placeholder="Find a workspace page…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setQuery('');}} className="h-10 w-60 rounded-lg border border-border bg-paper px-3 text-sm text-ink placeholder:text-ink-muted" />
        {query.trim() && <div className="absolute right-0 top-12 w-72 rounded-xl border border-border bg-surface p-2 shadow-xl" role="region" aria-label="Matching workspace pages">{matches.length ? matches.map(([name,href])=><Link key={href} href={href} onClick={()=>setQuery('')} className="block rounded-lg px-3 py-3 text-sm font-semibold text-ink hover:bg-paper">{name} <span className="float-right text-navy">↗</span></Link>) : <p className="p-3 text-sm text-ink-muted">No matching page. Try Accounts, Reports or Settings.</p>}</div>}
      </div>
      <ThemeToggle /><UserMenu email={email}/>
    </div>
  </header>;
}
