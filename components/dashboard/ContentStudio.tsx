"use client";

import { useEffect, useMemo, useState } from "react";
import { readRecovery, type RecoveryDraft } from "@/lib/draft-recovery";
import Link from "next/link";
import { isDraftImage, MAX_IMAGE_BYTES } from "@/lib/draft-image";
import Image from "next/image";
import DraftDeliveryActions, { type DeliveryReceipt } from "./DraftDeliveryActions";
import StudioMediaPreview from "./StudioMediaPreview";
import { deliveryText, LOCKED_DELIVERIES } from "@/lib/content-publishing";
import { editorFingerprint } from "@/lib/studio-editor";

type Account = { id: string; platform: string; displayName: string | null; platformUserId?: string | null };
type Draft = {
  id: string;
  text: string;
  mediaUrl: string | null;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
  publications: DeliveryReceipt[];
  targets: Array<{ id: string; connectedAccount: Account }>;
};

type Props = {
  userId: string;
  plan: "FREE" | "PRO";
  draftLimit: number | null;
  accounts: Account[];
  initialDrafts: Draft[];
};

const PLATFORM_NAMES: Record<string, string> = {
  x: "X",
  facebook: "Facebook",
  tiktok: "TikTok",
};

const PLATFORM_LIMITS: Record<string, number> = {
  x: 280,
  facebook: 63206,
  tiktok: 2200,
};

function labelFor(platform: string) {
  return PLATFORM_NAMES[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

function dateTimeInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function ContentStudio({ userId, plan, draftLimit, accounts, initialDrafts }: Props) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [view, setView] = useState<"compose" | "library" | "calendar">("compose");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [targetIds, setTargetIds] = useState<string[]>(accounts[0] ? [accounts[0].id] : []);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [baseline, setBaseline] = useState(() => editorFingerprint({ text: "", mediaUrl: "", scheduledFor: "", targetIds: accounts[0] ? [accounts[0].id] : [] }));
  const dirty = editorFingerprint({ text, mediaUrl, scheduledFor, targetIds }) !== baseline;
  const recoveryKey = `signal-draft:${userId}`;
  const [recovery, setRecovery] = useState<RecoveryDraft | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try { setRecovery(readRecovery(sessionStorage.getItem(recoveryKey))); } catch { /* Recovery is best effort. */ }
      setRecoveryReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [recoveryKey]);
  useEffect(() => {
    if (!recoveryReady || recovery) return;
    try {
      if (dirty) sessionStorage.setItem(recoveryKey, JSON.stringify({text,mediaUrl,scheduledFor,targetIds,savedAt:Date.now()}));
      else sessionStorage.removeItem(recoveryKey);
    } catch { /* Saving the server draft remains available when browser storage is blocked. */ }
  }, [recoveryReady,recovery,recoveryKey,dirty,text,mediaUrl,scheduledFor,targetIds]);
  function restoreRecovery() {
    if (!recovery) return;
    setEditingId(null); setRevision(null); setConflict(false);
    setText(recovery.text); setMediaUrl(recovery.mediaUrl); setScheduledFor(recovery.scheduledFor);
    setTargetIds(recovery.targetIds.filter(id=>accounts.some(account=>account.id===id)));
    setRecovery(null); setView("compose");
    setMessage("Recovered as a new draft. Review the accounts and save when ready.");
  }


  useEffect(() => {
    if (!dirty && !busy) return;
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href);
      if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (busy || !window.confirm("Leave Content Studio and discard your unsaved changes?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", leave);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", leave); document.removeEventListener("click", navigate, true); };
  }, [dirty, busy]);

  function canReplaceEditor() {
    return !busy && (!dirty || window.confirm("Discard the unsaved changes in your editor?"));
  }

  const selectedAccounts = accounts.filter((account) => targetIds.includes(account.id));
  const visibleDrafts = drafts.filter((draft) => {
    const platformMatch =
      platformFilter === "all" ||
      draft.targets.some(({ connectedAccount }) => connectedAccount.platform === platformFilter);
    return draft.text.toLowerCase().includes(search.toLowerCase()) && platformMatch && (statusFilter === "all" || draft.status === statusFilter);
  });

  function resetEditor() {
    setEditingId(null);
    setText("");
    setMediaUrl("");
    setScheduledFor("");
    setTargetIds(accounts[0] ? [accounts[0].id] : []);
    setMessage("");
    setRevision(null);
    setConflict(false);
    setBaseline(editorFingerprint({ text: "", mediaUrl: "", scheduledFor: "", targetIds: accounts[0] ? [accounts[0].id] : [] }));
  }

  function editDraft(draft: Draft) {
    if (!canReplaceEditor()) return;
    const immutable = draft.publications?.some((row) => LOCKED_DELIVERIES.includes(row.status));
    setEditingId(immutable ? null : draft.id);
    setText(draft.text);
    setMediaUrl(draft.mediaUrl ?? "");
    setScheduledFor(immutable ? "" : dateTimeInputValue(draft.scheduledFor));
    setTargetIds(draft.targets.map(({ connectedAccount }) => connectedAccount.id));
    setMessage("");
    setRevision(immutable ? null : draft.updatedAt);
    setConflict(false);
    setBaseline(editorFingerprint({ text: draft.text, mediaUrl: draft.mediaUrl ?? "", scheduledFor: immutable ? "" : dateTimeInputValue(draft.scheduledFor), targetIds: draft.targets.map(({ connectedAccount }) => connectedAccount.id) }));
    setView("compose");
  }

  function toggleTarget(id: string) {
    setMessage("");
    setTargetIds((current) => {
      if (current.includes(id)) return current.filter((targetId) => targetId !== id);
      if (plan !== "PRO" && current.length >= 1) {
        setMessage("Multi-platform drafts are a Pro feature. Free drafts use one account.");
        return current;
      }
      return [...current, id];
    });
  }

  async function saveDraft(asDuplicate = false) {
    if (busy) return;
    if (!text.trim() || !targetIds.length) {
      setMessage("Add some content and choose at least one account.");
      return;
    }
    setBusy(true);
    setMessage("");
    const id = asDuplicate ? null : editingId;
    try {
      const response = await fetch(id ? `/api/drafts/${id}` : "/api/drafts", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          mediaUrl,
          targetIds,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          expectedUpdatedAt: id ? revision : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "DRAFT_CONFLICT" || data.code === "DRAFT_VERSION_REQUIRED") setConflict(true);
        throw new Error(data.error ?? "Could not save this draft.");
      }

      setDrafts((current) =>
        id ? current.map((draft) => (draft.id === id ? data : draft)) : [data, ...current]
      );
      setEditingId(data.id);
      setText(data.text);
      setMediaUrl(data.mediaUrl ?? "");
      setScheduledFor(dateTimeInputValue(data.scheduledFor));
      setRevision(data.updatedAt);
      setConflict(false);
      setBaseline(editorFingerprint({ text: data.text, mediaUrl: data.mediaUrl ?? "", scheduledFor: dateTimeInputValue(data.scheduledFor), targetIds }));
      setView("library");
      setMessage(asDuplicate ? "Draft duplicated." : id ? "Draft updated." : "Draft saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this draft.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshDrafts() {
    const response = await fetch("/api/drafts", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not refresh drafts.");
    setDrafts(await response.json());
  }

  async function deleteDraft(id: string) {
    if (busy) return;
    if (editingId === id && !canReplaceEditor()) return;
    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
    try {
    const response = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
    if (response.ok) {
      setDrafts((current) => current.filter((draft) => draft.id !== id));
      if (editingId === id) resetEditor();
      setMessage("Draft deleted.");
    } else {
      const data = await response.json();
      setMessage(data.error ?? "Could not delete this draft.");
    }
    } catch { setMessage("Could not reach Signal. Try deleting this draft again later."); }
  }

  const calendar = useMemo(() => {
    const current = new Date();
    const now = new Date(current.getFullYear(), current.getMonth() + calendarOffset, 1);
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const dayCount = new Date(year, month + 1, 0).getDate();
    return {
      title: now.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      days: [
        ...Array.from({ length: firstDay }, () => null),
        ...Array.from({ length: dayCount }, (_, index) => index + 1),
      ],
      draftsForDay(day: number) {
        return drafts.filter((draft) => {
          if (!draft.scheduledFor) return false;
          const date = new Date(draft.scheduledFor);
          return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
        });
      },
    };
  }, [drafts, calendarOffset]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy">Content</p>
          <h1 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">Content Studio</h1>
          <p className="mt-2 text-sm text-ink-muted">From first idea to published post. Write, preview, plan and send from one workspace.</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
          <span className="font-medium text-ink">{plan} plan</span>
          <span className="ml-2 text-ink-muted">
            {drafts.length}{draftLimit === null ? " drafts, unlimited" : ` of ${draftLimit} drafts`}
          </span>
        </div>
      </div>

      {recovery && <section className="rounded-xl border border-border bg-surface p-4"><p className="text-sm">An unsaved draft was recovered from this browser tab.</p><div className="mt-3 flex gap-3"><button type="button" onClick={restoreRecovery} className="rounded bg-navy px-3 py-2 text-sm text-white">Restore as new draft</button><button type="button" onClick={()=>{try{sessionStorage.removeItem(recoveryKey);}catch{} setRecovery(null);}} className="text-sm">Discard recovery</button></div></section>}
      <p className="text-xs text-ink-muted">Unsaved work is kept temporarily in this browser tab when storage is available. Save your draft to keep it across devices.</p>
      <div className="grid grid-cols-3 gap-3">
        {[["Drafts", drafts.filter((d) => d.status === "DRAFT").length], ["Planned", drafts.filter((d) => d.status === "SCHEDULED").length], ["Published", drafts.filter((d) => d.status === "PUBLISHED").length]].map(([label, count]) => <div key={label} className="rounded-xl border border-border bg-surface p-4"><p className="text-xs text-ink-muted">{label}</p><p className="mt-1 font-display text-2xl text-ink">{count}</p></div>)}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {(["compose", "library", "calendar"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setView(item)}
            className={`rounded-md px-4 py-2 text-sm font-medium capitalize ${
              view === item ? "bg-navy text-white" : "bg-surface text-ink-muted hover:text-ink"
            }`}
          >
            {item === "compose" ? (editingId ? "Edit draft" : "New draft") : item}
          </button>
        ))}
      </div>

      {message && (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-ink" role="status">
          {message}
        </p>
      )}

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-8 py-16 text-center">
          <h2 className="font-display text-xl font-medium text-ink">Connect an account first</h2>
          <p className="mt-2 text-sm text-ink-muted">Content previews need at least one connected platform.</p>
          <Link href="/dashboard/accounts" className="mt-5 inline-flex rounded-md bg-navy px-4 py-2 text-sm font-medium text-white">
            Go to Accounts
          </Link>
        </div>
      ) : view === "compose" ? (
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-xl border border-border bg-surface p-6">
            <p role="status" className="mb-4 text-xs font-medium text-ink-muted">{busy ? "Saving your changes..." : dirty ? "Unsaved changes" : editingId ? "All changes saved" : "Ready for your next idea"}</p>
            <fieldset disabled={busy} className="space-y-5">
            <div>
              <label htmlFor="draft-text" className="text-sm font-medium text-ink">Post content</label>
              <textarea
                id="draft-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={9}
                maxLength={5000}
                placeholder="What do you want your audience to know?"
                className="mt-2 w-full resize-y rounded-lg border border-border bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-muted"
              />
              <p className="mt-1 text-right text-xs text-ink-muted">{text.length} / 5,000</p>
            </div>

            <div><p className="text-xs font-medium text-ink-muted">Start with a structure</p><div className="mt-2 flex flex-wrap gap-2">{["Announcement", "Helpful tip", "Question"].map((label) => <button key={label} onClick={() => { if (text && !window.confirm("Replace the editor text with this template?")) return; setText(label === "Announcement" ? "Something new is coming.\n\n[What is changing and why it matters]\n\n[When it is available]\n\n[One clear next step]" : label === "Helpful tip" ? "One thing I wish I knew earlier:\n\n[Your useful tip]\n\n[An example readers can try]\n\nSave this for later." : "What is your biggest challenge with [topic]?\n\n[Share your own experience]\n\nTell me in the replies."); }} className="rounded-full border border-border px-3 py-1.5 text-xs text-ink">{label}</button>)}</div></div>
            <fieldset>
              <legend className="text-sm font-medium text-ink">Publish to</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {accounts.map((account) => (
                  <label key={account.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-paper p-3 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={targetIds.includes(account.id)}
                      onChange={() => toggleTarget(account.id)}
                      className="h-4 w-4 accent-navy"
                    />
                    <span>{labelFor(account.platform)}</span>
                    <span className="truncate text-xs text-ink-muted">{account.displayName}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-3">
              <label htmlFor="image-file" className="block text-sm font-medium text-ink">Attach an image</label>
              <input id="image-file" type="file" accept="image/jpeg,image/png" disabled={busy}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (!["image/jpeg", "image/png"].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
                    setMessage("Choose a JPEG or PNG image up to 1 MB."); return;
                  }
                  setBusy(true);
                  try {
                    const data = await new Promise<string>((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(String(reader.result));
                      reader.onerror = () => reject(new Error("Could not read this image."));
                      reader.readAsDataURL(file);
                    });
                    setMediaUrl(data); setMessage("Image selected. Save the draft to upload it.");
                  } catch { setMessage("Could not read this image. Please try another file."); }
                  finally { setBusy(false); }
                }} className="block w-full text-sm text-ink" />
              <p className="text-xs text-ink-muted">One JPEG or PNG, up to 1 MB and 12 megapixels. Images are resized when saved. Direct image publishing supports X; download and attach manually for Facebook or TikTok.</p>
              {isDraftImage(mediaUrl) ? <button type="button" disabled={busy} onClick={() => setMediaUrl("")} className="text-sm text-navy underline">Remove image</button> : <>
                <label htmlFor="media-url" className="block text-sm font-medium text-ink">Or attach a link</label>
                <input id="media-url" type="url" value={mediaUrl} disabled={busy}
                  onChange={(event) => setMediaUrl(event.target.value)} placeholder="https://example.com/article"
                  className="w-full rounded-lg border border-border bg-paper px-4 py-3 text-sm text-ink" />
              </>}
            </div>

            <div>
              <Link href="/dashboard/queue" className="mb-3 block text-sm font-medium text-navy underline">Publishing queue, notifications and scheduling</Link>
              <label htmlFor="scheduled-for" className="text-sm font-medium text-ink">Plan date and time <span className="font-normal text-ink-muted">optional</span></label>
              <input
                id="scheduled-for"
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-paper px-4 py-3 text-sm text-ink"
              />
              <p className="mt-1 text-xs text-ink-muted">This saves a reminder. To authorize automatic delivery, save first, then open Publishing queue.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => saveDraft(false)} disabled={busy || conflict || (!!editingId && !dirty)} className="rounded-md bg-navy px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                {busy ? "Saving..." : editingId ? "Update draft" : "Save draft"}
              </button>
              {editingId && (
                <>
                  <button onClick={() => saveDraft(true)} disabled={busy} className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink">Save as copy</button>
                  <button onClick={() => { if (canReplaceEditor()) resetEditor(); }} className="rounded-md px-4 py-2.5 text-sm text-ink-muted">New draft</button>
                </>
              )}
            </div>
            {conflict && <p role="alert" className="text-sm leading-6 text-ink">A newer version exists. Save your writing as a copy, or refresh the Library and open the latest version.</p>}
            </fieldset>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-medium text-ink">Platform preview</h2>
              <p className="mt-1 text-sm text-ink-muted">Preview your saved content before publishing. Links count toward the X text limit.</p>
            </div>
            {selectedAccounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-muted">Choose an account to see its preview.</div>
            ) : (
              selectedAccounts.map((account) => {
                const limit = PLATFORM_LIMITS[account.platform] ?? 5000;
                const previewText = account.platform === "x" ? deliveryText(text, mediaUrl || null) : text;
                const length = Array.from(previewText).length;
                const overLimit = length > limit;
                return (
                  <article key={account.id} className="rounded-xl border border-border bg-surface p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Image src={`/api/accounts/${account.id}/profile-image`} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-full bg-paper object-cover" />
                        <div><p className="font-medium text-ink">{account.displayName || "Your account"}</p>
                        <p className="text-xs text-ink-muted">{labelFor(account.platform)} preview</p></div>
                      </div>
                      <span className={`text-xs font-medium ${overLimit ? "text-red-600" : "text-ink-muted"}`}>{length} / {limit.toLocaleString()}</span>
                    </div>
                    {mediaUrl && <StudioMediaPreview key={mediaUrl} url={mediaUrl} />}
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink">{previewText || "Your post preview will appear here."}</p>
                    {overLimit && <p className="mt-3 text-xs font-medium text-red-600">Shorten this content before publishing to {labelFor(account.platform)}.</p>}
                  </article>
                );
              })
            )}
          </section>
        </div>
      ) : view === "library" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <input type="search" aria-label="Search drafts" placeholder="Search your content" value={search} onChange={(event) => setSearch(event.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink" />
            <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink">
              <option value="all">All platforms</option>
              {accounts.map((account) => <option key={account.id} value={account.platform}>{labelFor(account.platform)}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink">
              <option value="all">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Planned</option>
              <option value="PARTIAL">Partly sent</option><option value="PUBLISHED">Published</option>
            </select>
            <button onClick={() => refreshDrafts().then(() => setMessage("Draft library refreshed.")).catch(() => setMessage("Could not refresh drafts. Your editor is unchanged."))} disabled={busy} className="rounded-md border border-border px-4 py-2 text-sm text-ink">Refresh library</button>
            <button onClick={() => { if (canReplaceEditor()) { resetEditor(); setView("compose"); } }} disabled={busy} className="ml-auto rounded-md bg-navy px-4 py-2 text-sm font-medium text-white">New draft</button>
          </div>
          {visibleDrafts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-sm text-ink-muted">No drafts match these filters.</div>
          ) : visibleDrafts.map((draft) => (
            <article key={draft.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink">{draft.status === "SCHEDULED" ? "Planned" : draft.status === "PUBLISHED" ? "Published" : draft.status === "PARTIAL" ? "Partly sent" : "Draft"}</span>
                    {draft.targets.map(({ connectedAccount }) => (
                      <span key={connectedAccount.id} className="rounded-full bg-navy/10 px-2.5 py-1 text-xs text-navy">{labelFor(connectedAccount.platform)}</span>
                    ))}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">{draft.text}</p>
                  <p className="mt-3 text-xs text-ink-muted">
                    {draft.scheduledFor ? `Planned for ${new Date(draft.scheduledFor).toLocaleString()}` : `Updated ${new Date(draft.updatedAt).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => editDraft(draft)} className="rounded-md border border-border px-3 py-2 text-xs font-medium text-ink">{draft.publications?.some((row) => LOCKED_DELIVERIES.includes(row.status)) ? "Reuse as new" : "Edit"}</button>
                  <button disabled={draft.publications?.some((row) => LOCKED_DELIVERIES.includes(row.status))} onClick={() => deleteDraft(draft.id)} className="rounded-md border border-border px-3 py-2 text-xs font-medium text-red-600 disabled:opacity-30">Delete</button>
                </div>
              </div>
              <DraftDeliveryActions draft={draft} refresh={refreshDrafts} notify={setMessage} />
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-lg font-medium text-ink">{calendar.title}</h2><div className="flex gap-2"><button aria-label="Previous month" onClick={() => setCalendarOffset((n) => n - 1)} className="rounded-md border border-border px-3 py-2 text-sm text-ink">Previous</button><button onClick={() => setCalendarOffset(0)} className="rounded-md border border-border px-3 py-2 text-sm text-ink">Today</button><button aria-label="Next month" onClick={() => setCalendarOffset((n) => n + 1)} className="rounded-md border border-border px-3 py-2 text-sm text-ink">Next</button></div></div>
          <p className="mt-1 text-sm text-ink-muted">Browse planned content by month. Dates organize your calendar; sending still needs your confirmation.</p>
          <div className="mt-5 grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-border text-center text-xs font-medium text-ink-muted">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <div key={day} className="bg-paper p-2">{day}</div>)}
            {calendar.days.map((day, index) => (
              <div key={`${day}-${index}`} className="min-h-24 bg-surface p-2 text-left">
                {day && (
                  <>
                    <span className="text-xs font-medium text-ink">{day}</span>
                    <div className="mt-2 space-y-1">
                      {calendar.draftsForDay(day).slice(0, 3).map((draft) => (
                        <button key={draft.id} onClick={() => editDraft(draft)} className="block w-full truncate rounded bg-navy/10 px-1.5 py-1 text-left text-[10px] text-navy">
                          {draft.text}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
