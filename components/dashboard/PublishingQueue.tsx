"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type QueueDraft={id:string;text:string;hasImage:boolean;status:string;scheduledFor:string|null;updatedAt:string;accounts:{id:string;label:string;platform:string;blocker:string|null}[];receipts:{accountId:string;status:string;error:string|null;url:string|null;updatedAt:string}[]};
const labels:Record<string,string>={DRAFT:"Draft",SCHEDULED:"Reminder only",QUEUED:"Scheduled",PROCESSING:"Processing",ATTENTION:"Needs attention",PARTIAL:"Partly published",PUBLISHED:"Published"};
const lockedStatuses=["PUBLISHING","UNKNOWN","PUBLISHED"];
export default function PublishingQueue({userId,drafts,schedulingEnabled}:{userId:string;drafts:QueueDraft[];schedulingEnabled:boolean}) {
  const router=useRouter();
  const [filter,setFilter]=useState("all");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState<string|null>(null);
  const [readAt,setReadAt]=useState("");
  const [timezone,setTimezone]=useState("UTC");
  useEffect(()=>{const timer=setTimeout(()=>{setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);try{setReadAt(localStorage.getItem(`signal-notifications:${userId}`)||"");}catch{}},0);return()=>clearTimeout(timer);},[userId]);
  useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==="visible" && !busy) router.refresh();},15000);return()=>clearInterval(timer);},[router,busy]);
  const notifications=drafts.filter(d=>["ATTENTION","PARTIAL","PUBLISHED"].includes(d.status) || d.receipts.some(r=>r.status!=="PENDING" && r.status!=="PUBLISHING"));
  const unread=notifications.filter(d=>[d.updatedAt,...d.receipts.map(r=>r.updatedAt)].some(time=>time>readAt)).length;
  function markRead(){const now=new Date().toISOString();setReadAt(now);try{localStorage.setItem(`signal-notifications:${userId}`,now);}catch{}}
  async function act(draft:QueueDraft,action:"schedule"|"cancel"|"retry",scheduledFor?:string,accountId?:string) {
    if(busy)return;
    const account=accountId?draft.accounts.find(a=>a.id===accountId)?.label:draft.accounts.map(a=>a.label).join(", ");
    const detail=action==="cancel"?"Cancel automatic delivery?":`${action==="retry"?"Retry delivery now":"Schedule automatic delivery"} to ${account}?\n${scheduledFor?new Date(scheduledFor).toLocaleString()+` (${timezone})`:"Now"}\n${draft.hasImage?"Includes the saved image.\n":""}\n${draft.text}`;
    if(!window.confirm(detail))return;
    setBusy(draft.id);setMessage("");
    try {
      const response=await fetch(`/api/drafts/${draft.id}/${action==="retry"?"publish":"schedule"}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action==="retry"?{accountId,confirm:true}:{action,confirm:true,expectedUpdatedAt:draft.updatedAt,scheduledFor})});
      const data=await response.json();
      setMessage(response.ok?action==="cancel"?"Schedule cancelled. You can edit the draft.":action==="retry"?"Delivery completed. Check the receipt below.":"Automatic delivery confirmed. You can cancel before processing starts.":data.error || "Action failed. Refresh and check the delivery status.");
    } catch {setMessage("Connection interrupted. Refresh and check the delivery status before retrying.");}
    finally {setBusy(null);router.refresh();}
  }
  const visible=drafts.filter(d=>{
    if(filter==="all") return true;
    if(filter==="attention") return ["ATTENTION","PARTIAL"].includes(d.status) || d.receipts.some(r=>["FAILED","UNKNOWN","PERMISSION_REQUIRED","RATE_LIMITED","BILLING_REQUIRED"].includes(r.status));
    return d.status===filter;
  });
  return <div className="mx-auto max-w-4xl space-y-6">
    <div><h1 className="font-display text-3xl text-ink">Publishing queue</h1><p className="mt-2 text-sm text-ink-muted">Review saved posts, confirm a schedule and track delivery. Times use {timezone}. Showing your latest 100 drafts.</p><Link href="/dashboard/content" className="mt-3 inline-block text-sm text-navy underline">Open Content Studio</Link></div>
    {!schedulingEnabled && <p className="rounded-xl border border-border bg-paper p-4 text-sm">Automatic scheduling is not active. You can prepare drafts and reminders; confirmed scheduling becomes available after the service is enabled.</p>}
    <section className="rounded-xl border border-border bg-surface p-5" aria-label="Publishing notifications">
      <div className="flex items-center justify-between"><h2 className="font-medium">Notifications {unread>0?`(${unread} new)`:""}</h2><button onClick={markRead} className="text-sm text-navy underline">Mark read on this device</button></div>
      {!notifications.length?<p className="mt-2 text-sm text-ink-muted">Delivery updates will appear here.</p>:<ul className="mt-3 space-y-2">{notifications.slice(0,8).map(d=><li key={d.id} className="text-sm"><a href={`#draft-${d.id}`} className="text-navy underline">{labels[d.status]||"Delivery update"}: {d.text.slice(0,65)}</a></li>)}</ul>}
    </section>
    <label className="block text-sm">Filter posts <select value={filter} onChange={e=>setFilter(e.target.value)} className="ml-2 rounded border border-border bg-surface p-2"><option value="all">All</option><option value="QUEUED">Scheduled</option><option value="PROCESSING">Processing</option><option value="PUBLISHED">Published</option><option value="attention">Needs attention</option></select></label>
    {message && <p role="status" className="rounded-lg bg-paper p-4 text-sm">{message}</p>}
    {!visible.length && <p className="text-sm text-ink-muted">No posts in this view. Save a draft in Content Studio to begin.</p>}
    {visible.map(d=><article id={`draft-${d.id}`} key={d.id} className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap justify-between gap-2"><h2 className="font-medium">{labels[d.status]||d.status}</h2>{d.scheduledFor && <time className="text-sm text-ink-muted">{new Date(d.scheduledFor).toLocaleString("en-GB",{timeZone:timezone})} ({timezone})</time>}</div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm">{d.text}</p>{d.hasImage&&<p className="mt-2 text-xs text-ink-muted">Saved image attached. Preview it in Content Studio before confirming.</p>}
      <ul className="mt-4 space-y-3">{d.accounts.map(a=>{const receipt=d.receipts.find(r=>r.accountId===a.id);const retry=receipt && ["FAILED","PERMISSION_REQUIRED","RATE_LIMITED","BILLING_REQUIRED"].includes(receipt.status) && !["QUEUED","PROCESSING"].includes(d.status);return <li key={a.id} className="rounded-lg bg-paper p-3 text-sm">
        <p className="font-medium">{a.label} · {a.platform}</p><p className="mt-1 text-ink-muted">{receipt?.status==="PUBLISHED"?"Published":a.blocker||"Configured for this post. Permissions and credits are verified when sending."}</p>
        {receipt?.error&&<p className="mt-1 text-ink-muted">{receipt.error}</p>}
        {receipt?.url&&<a href={receipt.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-navy underline">View published post</a>}
        {receipt&&["UNKNOWN","PUBLISHING"].includes(receipt.status)&&<p className="mt-2">Delivery is unconfirmed. Check the platform before creating a copy; automatic retry is blocked.</p>}
        {a.blocker?.toLowerCase().includes("reconnect")&&<Link href="/dashboard/accounts" className="mt-2 block text-navy underline">Reconnect account</Link>}
        {retry&&<button disabled={!!busy||!!a.blocker} onClick={()=>act(d,"retry",undefined,a.id)} className="mt-2 rounded border border-border px-3 py-2 disabled:opacity-50">Retry this account</button>}
      </li>;})}</ul>
      {d.status==="ATTENTION"&&<p className="mt-3 text-sm text-ink-muted">This delivery needs review. It may have missed its delivery window or stopped before sending. Review receipts before retrying or preparing a new schedule.</p>}
      {d.status==="PROCESSING"?<p className="mt-3 text-sm">Delivery has started. Editing and cancellation are locked.</p>:!d.receipts.some(r=>lockedStatuses.includes(r.status))&&<ScheduleForm key={`${d.id}-${d.updatedAt}`} draft={d} disabled={!!busy || !schedulingEnabled || d.accounts.some(a=>!!a.blocker) || !d.accounts.length} timezone={timezone} submit={when=>act(d,"schedule",when)} />}
      {d.status==="QUEUED"&&<button disabled={!!busy} onClick={()=>act(d,"cancel")} className="mt-3 text-sm text-navy underline">Cancel schedule to edit or publish manually</button>}
    </article>)}
  </div>;
}
function ScheduleForm({draft,disabled,timezone,submit}:{draft:QueueDraft;disabled:boolean;timezone:string;submit:(value:string)=>void}) {
  const [when,setWhen]=useState("");const [error,setError]=useState("");
  function confirm(){const date=new Date(when);const parts=when.split(/[-T:]/).map(Number);if(!Number.isFinite(date.getTime()) || date.getFullYear()!==parts[0] || date.getMonth()+1!==parts[1] || date.getDate()!==parts[2] || date.getHours()!==parts[3] || date.getMinutes()!==parts[4]){setError("Choose a valid local time. This time may not exist during a clock change.");return;}setError("");submit(date.toISOString());}
  return <div className="mt-4 space-y-2"><label className="block text-sm" htmlFor={`when-${draft.id}`}>Delivery time ({timezone})</label><input id={`when-${draft.id}`} type="datetime-local" value={when} onChange={e=>setWhen(e.target.value)} disabled={disabled} className="rounded border border-border bg-paper p-2 text-sm"/><button disabled={disabled||!when} onClick={confirm} className="ml-2 rounded bg-navy px-3 py-2 text-sm text-white disabled:opacity-50">{draft.status==="QUEUED"?"Confirm new time":"Confirm automatic schedule"}</button><p className="text-xs text-ink-muted">One minute to 90 days ahead. Repeated clock-change times use the earlier occurrence. Delivery runs on the next worker tick, subject to platform availability.</p>{error&&<p role="alert" className="text-sm text-red-600">{error}</p>}</div>;
}
