"use client";

import { useState } from "react";
import { ChatMessage, GitHubRepo } from "@/lib/types";
import RepoChat from "./RepoChat";
import NotesPanel from "./NotesPanel";

interface Props {
  repo: GitHubRepo;
  onClose: () => void;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
}

type Tab = "chat" | "notes";

export default function RepoDetailPanel({ repo, onClose, messages, onMessagesChange }: Props) {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(10,11,14,0.6)" }}
        onClick={onClose}
      />
      <div
        className="fade-up relative flex h-full w-full max-w-md flex-col border-l p-5"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-mono-tabular text-sm font-medium" style={{ color: "var(--text)" }}>
              {repo.fullName}
            </p>
            <p className="truncate text-xs" style={{ color: "var(--text-dim)" }}>
              {repo.description || "No description."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded px-2 py-1 text-xs"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            close
          </button>
        </div>

        <div className="mt-4 flex gap-1 border-b" style={{ borderColor: "var(--border)" }}>
          {(["chat", "notes"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-2 font-mono-tabular text-xs"
              style={{
                color: tab === t ? "var(--accent)" : "var(--text-dim)",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-0 flex-1">
          {tab === "chat" ? (
            <RepoChat repo={repo} messages={messages} onMessagesChange={onMessagesChange} />
          ) : (
            <NotesPanel key={repo.fullName} scopeKey={repo.fullName} />
          )}
        </div>
      </div>
    </div>
  );
}
