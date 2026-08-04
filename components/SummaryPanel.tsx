"use client";

import { useState } from "react";

export default function SummaryPanel({ username }: { username: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSummary() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to summarize");
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fade-up rounded-md border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono-tabular text-xs" style={{ color: "var(--text-dim)" }}>
          # ai summary
        </span>
        {!summary && (
          <button
            onClick={runSummary}
            disabled={loading}
            className="rounded px-3 py-1 font-mono-tabular text-xs font-medium transition-colors disabled:opacity-40"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {loading ? "analyzing…" : "analyze profile"}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm" style={{ color: "var(--diff-remove)" }}>
          {error}
        </p>
      )}

      {summary && (
        <p className="fade-up mt-2 text-sm leading-relaxed" style={{ color: "var(--text)" }}>
          {summary}
        </p>
      )}

      {!summary && !loading && !error && (
        <p className="mt-2 text-sm" style={{ color: "var(--text-dim)" }}>
          Ask the model to read this profile and describe what it sees.
        </p>
      )}
    </div>
  );
}
