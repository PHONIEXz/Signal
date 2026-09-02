"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Account = { id: string; platform: string; displayName: string | null };
type Draft = {
  id: string;
  text: string;
  mediaUrl: string | null;
  status: string;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
  targets: Array<{ id: string; connectedAccount: Account }>;
};

type Props = {
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

export default function ContentStudio({ plan, draftLimit, accounts, initialDrafts }: Props) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [view, setView] = useState<"compose" | "library" | "calendar">("compose");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [targetIds, setTargetIds] = useState<string[]>(accounts[0] ? [accounts[0].id] : []);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const selectedAccounts = accounts.filter((account) => targetIds.includes(account.id));
  const visibleDrafts = drafts.filter((draft) => {
    const platformMatch =
      platformFilter === "all" ||
      draft.targets.some(({ connectedAccount }) => connectedAccount.platform === platformFilter);
    return platformMatch && (statusFilter === "all" || draft.status === statusFilter);
  });

  function resetEditor() {
    setEditingId(null);
    setText("");
    setMediaUrl("");
    setScheduledFor("");
    setTargetIds(accounts[0] ? [accounts[0].id] : []);
    setMessage("");
  }

  function editDraft(draft: Draft) {
    setEditingId(draft.id);
    setText(draft.text);
    setMediaUrl(draft.mediaUrl ?? "");
    setScheduledFor(dateTimeInputValue(draft.scheduledFor));
    setTargetIds(draft.targets.map(({ connectedAccount }) => connectedAccount.id));
    setMessage("");
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
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save this draft.");

      setDrafts((current) =>
        id ? current.map((draft) => (draft.id === id ? data : draft)) : [data, ...current]
      );
      resetEditor();
      setView("library");
      setMessage(asDuplicate ? "Draft duplicated." : id ? "Draft updated." : "Draft saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this draft.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft(id: string) {
    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
    const response = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
    if (response.ok) {
      setDrafts((current) => current.filter((draft) => draft.id !== id));
      if (editingId === id) resetEditor();
      setMessage("Draft deleted.");
    } else {
      const data = await response.json();
      setMessage(data.error ?? "Could not delete this draft.");
    }
  }

  const calendar = useMemo(() => {
    const now = new Date();
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
  }, [drafts]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-navy">Content</p>
          <h1 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">Content Studio</h1>
          <p className="mt-2 text-sm text-ink-muted">Write, preview and organize content before it goes live.</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
          <span className="font-medium text-ink">{plan} plan</span>
          <span className="ml-2 text-ink-muted">
            {drafts.length}{draftLimit === null ? " drafts, unlimited" : ` of ${draftLimit} drafts`}
          </span>
        </div>
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
          <section className="space-y-5 rounded-xl border border-border bg-surface p-6">
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

            <div>
              <label htmlFor="media-url" className="text-sm font-medium text-ink">Media URL <span className="font-normal text-ink-muted">optional</span></label>
              <input
                id="media-url"
                type="url"
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="https://example.com/image.jpg"
                className="mt-2 w-full rounded-lg border border-border bg-paper px-4 py-3 text-sm text-ink"
              />
            </div>

            <div>
              <label htmlFor="scheduled-for" className="text-sm font-medium text-ink">Plan date and time <span className="font-normal text-ink-muted">optional</span></label>
              <input
                id="scheduled-for"
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-paper px-4 py-3 text-sm text-ink"
              />
              <p className="mt-1 text-xs text-ink-muted">This organizes your calendar. It does not publish automatically yet.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => saveDraft(false)} disabled={busy} className="rounded-md bg-navy px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                {busy ? "Saving..." : editingId ? "Update draft" : "Save draft"}
              </button>
              {editingId && (
                <>
                  <button onClick={() => saveDraft(true)} disabled={busy} className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink">Save as copy</button>
                  <button onClick={resetEditor} className="rounded-md px-4 py-2.5 text-sm text-ink-muted">Cancel</button>
                </>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-medium text-ink">Platform preview</h2>
              <p className="mt-1 text-sm text-ink-muted">Each platform checks its own text limit.</p>
            </div>
            {selectedAccounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-muted">Choose an account to see its preview.</div>
            ) : (
              selectedAccounts.map((account) => {
                const limit = PLATFORM_LIMITS[account.platform] ?? 5000;
                const overLimit = text.length > limit;
                return (
                  <article key={account.id} className="rounded-xl border border-border bg-surface p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{account.displayName || "Your account"}</p>
                        <p className="text-xs text-ink-muted">{labelFor(account.platform)} preview</p>
                      </div>
                      <span className={`text-xs font-medium ${overLimit ? "text-red-600" : "text-ink-muted"}`}>{text.length} / {limit.toLocaleString()}</span>
                    </div>
                    {mediaUrl && <div className="mt-4 rounded-lg bg-paper px-4 py-8 text-center text-xs text-ink-muted">Media attached by URL</div>}
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink">{text || "Your post preview will appear here."}</p>
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
            <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink">
              <option value="all">All platforms</option>
              {accounts.map((account) => <option key={account.id} value={account.platform}>{labelFor(account.platform)}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink">
              <option value="all">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Planned</option>
            </select>
            <button onClick={() => { resetEditor(); setView("compose"); }} className="ml-auto rounded-md bg-navy px-4 py-2 text-sm font-medium text-white">New draft</button>
          </div>
          {visibleDrafts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-sm text-ink-muted">No drafts match these filters.</div>
          ) : visibleDrafts.map((draft) => (
            <article key={draft.id} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink">{draft.status === "SCHEDULED" ? "Planned" : "Draft"}</span>
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
                  <button onClick={() => editDraft(draft)} className="rounded-md border border-border px-3 py-2 text-xs font-medium text-ink">Edit</button>
                  <button onClick={() => deleteDraft(draft.id)} className="rounded-md border border-border px-3 py-2 text-xs font-medium text-red-600">Delete</button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h2 className="font-display text-lg font-medium text-ink">{calendar.title}</h2>
          <p className="mt-1 text-sm text-ink-muted">Planned content for the current month.</p>
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
