"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ChatMessage, CHAT_ERROR_MARKER, GitHubRepo } from "@/lib/types";

interface Props {
  repo: GitHubRepo;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
}

export default function RepoChat({ repo, messages, onMessagesChange }: Props) {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const [owner, repoName] = repo.fullName.split("/");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || streaming) return;

    setError(null);
    setInput("");
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
    onMessagesChange(nextMessages);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo: repoName, messages: nextMessages }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Chat request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      const withPlaceholder: ChatMessage[] = [...nextMessages, { role: "assistant", content: "" }];
      onMessagesChange(withPlaceholder);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        onMessagesChange([...nextMessages, { role: "assistant", content: assistantText }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat request failed");
      onMessagesChange(nextMessages);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="themed-scroll flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Ask anything about {repo.fullName} — answers are grounded in its actual README,
            file structure, and recent commits.
          </p>
        )}
        {messages.map((m, i) => {
          const isErrorBubble = m.role === "assistant" && m.content.startsWith(CHAT_ERROR_MARKER);
          const displayContent = isErrorBubble
            ? m.content.slice(CHAT_ERROR_MARKER.length)
            : m.content;

          return (
            <div
              key={i}
              className="fade-up rounded-md border p-3 text-sm leading-relaxed"
              style={{
                borderColor: isErrorBubble ? "var(--diff-remove)" : "var(--border)",
                background: isErrorBubble
                  ? "var(--diff-remove-soft)"
                  : m.role === "user"
                    ? "var(--surface-raised)"
                    : "var(--surface)",
              }}
            >
              <span
                className="mb-1 block font-mono-tabular text-[10px]"
                style={{
                  color: isErrorBubble
                    ? "var(--diff-remove)"
                    : m.role === "user"
                      ? "var(--text-dim)"
                      : "var(--accent)",
                }}
              >
                {isErrorBubble ? "error" : m.role === "user" ? "you" : "assistant"}
              </span>
              <span style={{ color: "var(--text)" }}>
                {displayContent || (streaming && i === messages.length - 1 ? "…" : "")}
              </span>
            </div>
          );
        })}
        {error && (
          <p className="text-sm" style={{ color: "var(--diff-remove)" }}>
            {error}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What does this repo do?"
          spellCheck={false}
          disabled={streaming}
          className="flex-1 rounded-md border px-3 py-2 text-sm outline-none disabled:opacity-50"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="shrink-0 rounded px-3 py-2 font-mono-tabular text-xs font-medium disabled:opacity-40"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          {streaming ? "…" : "send"}
        </button>
      </form>
    </div>
  );
}
