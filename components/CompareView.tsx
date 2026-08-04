"use client";

import { FormEvent, useState } from "react";
import { CompareResult, UserMetrics } from "@/lib/types";
import { formatCount } from "@/lib/format";

const ROWS: { label: string; key: keyof UserMetrics; format?: (v: number) => string }[] = [
  { label: "repositories", key: "totalRepos" },
  { label: "total stars", key: "totalStars", format: formatCount },
  { label: "total forks", key: "totalForks", format: formatCount },
  { label: "followers", key: "followers", format: formatCount },
  { label: "avg stars / repo", key: "avgStarsPerRepo", format: (v) => v.toFixed(1) },
  { label: "commits (last yr)", key: "commitsLastYear", format: formatCount },
  { label: "account age (yrs)", key: "accountAgeYears", format: (v) => v.toFixed(1) },
];

export default function CompareView() {
  const [userA, setUserA] = useState("");
  const [userB, setUserB] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userA.trim() || !userB.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userA: userA.trim(), userB: userB.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Comparison failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-up space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3 sm:flex-row">
        <input
          value={userA}
          onChange={(e) => setUserA(e.target.value)}
          placeholder="first username"
          spellCheck={false}
          className="w-full flex-1 rounded-md border px-3 py-2 font-mono-tabular text-sm outline-none sm:w-auto"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}
        />
        <span className="font-mono-tabular text-xs" style={{ color: "var(--text-dim)" }}>
          vs
        </span>
        <input
          value={userB}
          onChange={(e) => setUserB(e.target.value)}
          placeholder="second username"
          spellCheck={false}
          className="w-full flex-1 rounded-md border px-3 py-2 font-mono-tabular text-sm outline-none sm:w-auto"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--text)" }}
        />
        <button
          type="submit"
          disabled={loading || !userA.trim() || !userB.trim()}
          className="w-full shrink-0 rounded px-4 py-2 font-mono-tabular text-xs font-medium disabled:opacity-40 sm:w-auto"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          {loading ? "diffing…" : "diff"}
        </button>
      </form>

      {error && (
        <p className="text-sm" style={{ color: "var(--diff-remove)" }}>
          {error}
        </p>
      )}

      {result && (
        <div className="fade-up overflow-hidden rounded-md border" style={{ borderColor: "var(--border)" }}>
          <div
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b px-4 py-3"
            style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}
          >
            <span className="truncate text-center font-mono-tabular text-sm font-medium" style={{ color: "var(--text)" }}>
              {result.userA.username}
            </span>
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>
              vs
            </span>
            <span className="truncate text-center font-mono-tabular text-sm font-medium" style={{ color: "var(--text)" }}>
              {result.userB.username}
            </span>
          </div>

          {ROWS.map((row) => {
            const a = result.userA[row.key] as number;
            const b = result.userB[row.key] as number;
            const fmt = row.format ?? ((v: number) => `${v}`);
            return (
              <div
                key={row.label}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b px-4 py-2.5 last:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                <span
                  className="text-center font-mono-tabular text-sm"
                  style={{ color: a >= b ? "var(--text)" : "var(--text-muted)" }}
                >
                  {fmt(a)}
                </span>
                <span className="text-center text-[11px]" style={{ color: "var(--text-dim)" }}>
                  {row.label}
                </span>
                <span
                  className="text-center font-mono-tabular text-sm"
                  style={{ color: b >= a ? "var(--text)" : "var(--text-muted)" }}
                >
                  {fmt(b)}
                </span>
              </div>
            );
          })}

          <div className="grid grid-cols-2 gap-4 px-4 py-3" style={{ background: "var(--surface-raised)" }}>
            <div className="text-center">
              <span
                className="font-mono-tabular text-xs"
                style={{
                  color:
                    result.userA.totalStars >= result.userB.totalStars
                      ? "var(--diff-add)"
                      : "var(--diff-remove)",
                }}
              >
                {result.userA.mostUsedLanguages.map((l) => l.language).slice(0, 3).join(", ") || "—"}
              </span>
            </div>
            <div className="text-center">
              <span
                className="font-mono-tabular text-xs"
                style={{
                  color:
                    result.userB.totalStars >= result.userA.totalStars
                      ? "var(--diff-add)"
                      : "var(--diff-remove)",
                }}
              >
                {result.userB.mostUsedLanguages.map((l) => l.language).slice(0, 3).join(", ") || "—"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
