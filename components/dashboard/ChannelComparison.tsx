"use client";
import { useState } from "react";
import Link from "next/link";
import type { GrowthPoint } from "@/lib/growth-chart";
import { channelComparison } from "@/lib/channel-comparison";

type Channel = {id:string;name:string;platform:string;data:GrowthPoint[];limited:boolean};
const signed = (n:number) => `${n > 0 ? '+' : ''}${n.toLocaleString()}`;
export default function ChannelComparison({accounts,asOf}:{accounts:Channel[];asOf:string}) {
  const [days,setDays]=useState(30);
  return <section className="space-y-4" aria-labelledby="channel-comparison-title">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 id="channel-comparison-title" className="text-xl font-bold text-ink">Compare channel growth</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">Follower changes between saved observations inside your selected window. Each card shows its actual coverage; channels may have different collection times.</p></div>
      <label className="text-sm font-semibold text-ink">Comparison window<select className="ml-3 min-h-11 rounded-lg border border-border bg-surface px-3" value={days} onChange={e=>setDays(Number(e.target.value))}>{[7,30,90].map(n=><option key={n} value={n}>Last {n} days</option>)}</select></label>
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{accounts.map(account=>{
      const result=channelComparison(account.data,days,asOf);
      return <article key={account.id} className="min-w-0 rounded-xl border border-border bg-surface p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{account.platform}</p><h3 className="mt-2 break-words text-lg font-bold text-ink">{account.name}</h3>
        <p className="mt-4 text-3xl font-bold text-ink">{result.delta===null?'Not enough data':signed(result.delta)}</p><p className="mt-1 text-sm text-ink-muted">{result.delta===null?'Two dated follower measurements are needed.':'net follower change across observed dates'}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-ink-muted">Latest in window</dt><dd className="font-semibold text-ink">{result.followers?.toLocaleString()??'Unavailable'}</dd></div><div><dt className="text-ink-muted">Growth</dt><dd className="font-semibold text-ink">{result.percent===null?'Not available':`${signed(Number(result.percent.toFixed(1)))}%`}</dd></div></dl>
        <p className="mt-4 text-xs leading-5 text-ink-muted">{result.first&&result.last?`${new Date(result.first).toISOString().slice(0,16).replace("T"," ")} to ${new Date(result.last).toISOString().slice(0,16).replace("T"," ")} (UTC) · ${result.count} saved observations`:'No observations in this window.'}</p>
        <p className="mt-3 text-sm leading-6 text-ink">{result.stale?'Latest observation is over 24 hours old. Check account collection status before acting.':result.delta===null?'Open account history to check collection coverage.':result.delta===0?'No net change was observed. This does not rule out changes between measurements.':result.delta>0?'Your recorded audience grew. Review recent content alongside these dates to investigate what contributed.':'Your recorded audience declined. Review the account history before attributing the change to a post.'}</p>
        {account.limited&&<p className="mt-2 text-xs text-ink-muted">Limited to the latest 90 saved observations.</p>}
        <Link href={`/dashboard/accounts/${account.platform}`} className="mt-4 inline-block py-2 text-sm font-semibold text-navy">Inspect account history ↗</Link>
      </article>;
    })}</div>
    <p className="text-xs leading-5 text-ink-muted">Growth from a zero baseline has no percentage. These are account follower counts, not unique people across platforms. Post views and engagement are not ranked because platform definitions and samples differ.</p>
  </section>;
}
