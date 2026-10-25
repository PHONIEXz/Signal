"use client";

import { useState, useRef, useEffect } from "react";
import SignalThinkingState from "@/components/dashboard/SignalThinkingState";
import { useReducedMotion } from "@/components/motion/useMotion";
import { waitForSignalAnalysis } from "@/lib/minimum-duration";

type Message = { role: "user" | "assistant"; content: string };

export default function InsightsChat({
  platform = "x",
  sampleSize = 10,
}: {
  platform?: string;
  sampleSize?: number;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const conversationRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!messages.length) return;
    const panel = conversationRef.current;
    panel?.scrollTo({top: panel.scrollHeight, behavior: reduced ? "instant" : "smooth"});
  }, [messages, loading, reduced]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const [res] = await Promise.all([
        fetch("/api/insights/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            platform,
            postLimit: sampleSize,
          }),
        }),
        waitForSignalAnalysis(),
      ]);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="workspace-panel rounded-3xl border border-border bg-surface p-5 sm:p-7">
      <h2 className="font-display text-xl font-bold tracking-tight text-ink">
        Ask about your account
      </h2>
      <p className="mt-2 text-sm text-ink-muted">A focused conversation about your saved metrics.</p>

      <div ref={conversationRef} role="log" aria-label="Account conversation" aria-live="polite" tabIndex={messages.length ? 0 : undefined} className={`${messages.length || loading ? "mt-5" : ""} flex max-h-80 flex-col gap-3 overflow-y-auto overscroll-contain`}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[90%] whitespace-pre-wrap break-words rounded-2xl bg-action px-4 py-2 text-sm text-white"
                : "mr-auto max-w-[90%] whitespace-pre-wrap break-words rounded-2xl bg-paper px-4 py-2 text-sm text-ink"
            }
          >
            <span className="sr-only">{m.role === "user" ? "You: " : "SocialPanora: "}</span>{m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto w-full max-w-[85%]">
            <SignalThinkingState compact />
          </div>
        )}
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

      <form className="mt-5 flex items-end gap-2 rounded-2xl border border-border bg-paper p-2 focus-within:border-action" onSubmit={event => {event.preventDefault(); void handleSend();}}>
        <label htmlFor={`account-question-${platform}`} className="sr-only">Your account question</label>
        <input id={`account-question-${platform}`} value={input} onChange={event => setInput(event.target.value)}
          placeholder="What would you like to know?" maxLength={2000}
          className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none placeholder:text-ink-muted" />
        <button type="submit" disabled={loading || !input.trim()} aria-label="Send question"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-action text-white transition-colors hover:bg-action-hover disabled:opacity-40">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7M12 5v14" /></svg>
        </button>
      </form>
    </div>
  );
}
