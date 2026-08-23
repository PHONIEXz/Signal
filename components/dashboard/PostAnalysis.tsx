"use client";

import { useState } from "react";
import Link from "next/link";

type PostData = {
  id: string;
  text: string;
  platform: string;
  likeCount: number;
  viewCount: number;
  replyCount: number;
  retweetCount: number;
  postedAt: string | null;
  url: string | null;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function PostAnalysis({
  post,
}: {
  post: PostData;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const platformLabel =
    post.platform === "x"
      ? "X"
      : post.platform.charAt(0).toUpperCase() +
        post.platform.slice(1);

  async function askAI(question: string) {
    if (!question.trim() || loading) return;

    const nextMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: question,
      },
    ];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/insights/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId: post.id,
          messages: nextMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to analyze post."
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/posts"
          className="text-xs text-ink-muted hover:text-ink"
        >
          ← Back to posts
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="font-display text-xl font-medium text-ink">
              Signal AI
            </p>

            <p className="mt-1 text-sm text-ink-muted">
              Analyze your {platformLabel} post.
            </p>
          </div>

          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border px-3 py-2 text-xs font-medium text-ink hover:bg-paper"
            >
              View post
            </a>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-ink">
            {post.text}
          </p>

          {post.postedAt && (
            <span className="shrink-0 text-xs text-ink-muted">
              {new Date(post.postedAt).toLocaleDateString(
                "en-US",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }
              )}
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-5 border-t border-border pt-4 text-xs text-ink-muted">
          <span>❤️ {post.likeCount.toLocaleString()}</span>
          <span>💬 {post.replyCount.toLocaleString()}</span>
          <span>🔁 {post.retweetCount.toLocaleString()}</span>
          <span>👁 {post.viewCount.toLocaleString()}</span>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="font-display text-lg font-medium text-ink">
          Quick analysis
        </p>

        <p className="mt-1 text-xs text-ink-muted">
          Ask Signal to analyze this specific post.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <QuickButton
            onClick={() =>
              askAI("Why did this post perform the way it did?")
            }
          >
            Why did this perform this way?
          </QuickButton>

          <QuickButton
            onClick={() =>
              askAI("Analyze the hook of this post.")
            }
          >
            Analyze my hook
          </QuickButton>

          <QuickButton
            onClick={() =>
              askAI(
                "How can I create another post like this that could perform even better?"
              )
            }
          >
            Make another like this
          </QuickButton>

          <QuickButton
            onClick={() =>
              askAI(
                "Give me 3 improved versions of this post while keeping my original idea."
              )
            }
          >
            Give me 3 better versions
          </QuickButton>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="font-display text-lg font-medium text-ink">
            Analysis
          </p>

          <div className="mt-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[85%] rounded-lg bg-navy px-4 py-3 text-sm text-white"
                    : "mr-auto max-w-[90%] whitespace-pre-wrap rounded-lg bg-paper px-4 py-3 text-sm leading-6 text-ink"
                }
              >
                {message.content}
              </div>
            ))}

            {loading && (
              <div className="mr-auto rounded-lg bg-paper px-4 py-3 text-sm text-ink-muted">
                Signal is analyzing your post...
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();
                askAI(input);
              }
            }}
            placeholder="Ask Signal about this post..."
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted/60 focus:border-navy"
          />

          <button
            type="button"
            onClick={() => askAI(input)}
            disabled={loading || !input.trim()}
            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-border bg-surface px-4 py-3 text-left text-sm text-ink transition-colors hover:bg-paper"
    >
      {children}
    </button>
  );
}
