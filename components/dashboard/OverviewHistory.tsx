"use client";
import { useState } from "react";
import Link from "next/link";
import GrowthChart from "./GrowthChart";
import type { GrowthPoint } from "@/lib/growth-chart";

type History = { id:string; platform:string; name:string; data:GrowthPoint[]; sampleData:GrowthPoint[]; limited:boolean };
export default function OverviewHistory({accounts,asOf}:{accounts:History[];asOf:string}) {
  const [selected,setSelected] = useState(accounts[0]?.id ?? "");
  const account=accounts.find(a=>a.id===selected) ?? accounts[0];
  if(!account)return null;
  return <section className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><label htmlFor="overview-chart-account" className="mr-3 text-sm font-semibold text-ink">Channel performance</label><select id="overview-chart-account" value={account.id} onChange={e=>setSelected(e.target.value)} className="min-h-11 max-w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink">{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.platform}</option>)}</select></div><Link href={`/dashboard/accounts/${account.platform}`} className="text-sm font-semibold text-navy">Full account history ↗</Link></div>
    <GrowthChart key={account.id} data={account.data} sampleData={account.sampleData} platform={account.platform} asOf={asOf}/>
    {account.limited && <p className="text-xs leading-5 text-ink-muted">Overview includes the latest 90 saved measurements. Open the full account history for a wider view.</p>}
  </section>;
}
