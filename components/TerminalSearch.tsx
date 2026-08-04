"use client";

import { FormEvent, useState } from "react";

interface Props {
  onSubmit: (username: string) => void;
  loading?: boolean;
  compact?: boolean;
}

export default function TerminalSearch({ onSubmit, loading, compact }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div
        className="flex items-center gap-2 rounded-md border px-4 transition-colors"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
          height: compact ? 44 : 56,
        }}
      >
        <span
          className="select-none font-mono-tabular"
          style={{ color: "var(--accent)", fontSize: compact ? 14 : 16 }}
        >
          $
        </span>
        <span
          className="select-none font-mono-tabular"
          style={{ color: "var(--text-dim)", fontSize: compact ? 14 : 16 }}
        >
          explore
        </span>
        <input
          autoFocus={!compact}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="octocat"
          spellCheck={false}
          className="flex-1 bg-transparent outline-none font-mono-tabular"
          style={{ color: "var(--text)", fontSize: compact ? 14 : 16 }}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="ml-2 shrink-0 rounded px-3 py-1 text-xs font-mono-tabular font-medium transition-colors disabled:opacity-40"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          {loading ? "running…" : "run ↵"}
        </button>
      </div>
    </form>
  );
}
