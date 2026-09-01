"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function InsightsChat({ platform = "x" }: { platform?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    const res = await fetch("/api/insights/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: nextMessages, platform }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }

    setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <p className="font-display text-lg font-medium text-ink">
        Ask about your account
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        Try &quot;what&apos;s my best post&quot; or &quot;how can I grow faster.&quot;
      </p>

      <div className="mt-4 flex max-h-80 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-ink-muted">
            No questions yet - try asking one below.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg bg-navy px-4 py-2 text-sm text-white"
                : "mr-auto max-w-[85%] rounded-lg bg-paper px-4 py-2 text-sm text-ink"
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto max-w-[85%] rounded-lg bg-paper px-4 py-2 text-sm text-ink-muted">
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask a question..."
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted/60 focus:border-navy"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading}
          className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-dark disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

