"use client";

import { useState } from "react";
import { ChatMessage, GitHubProfile, GitHubRepo } from "@/lib/types";
import TerminalSearch from "@/components/TerminalSearch";
import ProfileHeader from "@/components/ProfileHeader";
import SummaryPanel from "@/components/SummaryPanel";
import RepoGrid from "@/components/RepoGrid";
import RepoDetailPanel from "@/components/RepoDetailPanel";
import CompareView from "@/components/CompareView";
import NotesPanel from "@/components/NotesPanel";

type Mode = "explore" | "compare";

export default function Home() {
  const [mode, setMode] = useState<Mode>("explore");
  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  // Chat history per repo, keyed by full_name, so switching between
  // repos and coming back doesn't lose the conversation.
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});

  async function handleSearch(username: string) {
    setLoading(true);
    setError(null);
    setProfile(null);
    setSelectedRepo(null);
    try {
      const res = await fetch(`/api/github/profile/${encodeURIComponent(username)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load profile");
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10 sm:py-16">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-mono-tabular text-sm font-semibold" style={{ color: "var(--text)" }}>
            explore<span style={{ color: "var(--accent)" }}>.</span>
          </h1>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            A GitHub profile explorer
          </p>
        </div>
        <div className="flex gap-1 rounded-md border p-1" style={{ borderColor: "var(--border)" }}>
          {(["explore", "compare"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="rounded px-3 py-1.5 font-mono-tabular text-xs transition-colors"
              style={{
                background: mode === m ? "var(--accent-soft)" : "transparent",
                color: mode === m ? "var(--accent)" : "var(--text-dim)",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      {mode === "explore" ? (
        <div className="space-y-8">
          <TerminalSearch onSubmit={handleSearch} loading={loading} compact={!!profile} />

          {error && (
            <p className="fade-up text-sm" style={{ color: "var(--diff-remove)" }}>
              {error}
            </p>
          )}

          {!profile && !loading && !error && (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              Type a GitHub username above to pull their profile, repos, and an AI-written
              summary of what they build.
            </p>
          )}

          {profile && (
            <div className="space-y-8">
              <ProfileHeader user={profile.user} />
              <SummaryPanel username={profile.user.login} />

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono-tabular text-xs" style={{ color: "var(--text-dim)" }}>
                    # repositories ({profile.repos.length})
                  </span>
                </div>
                <RepoGrid
                  repos={profile.repos}
                  onSelect={setSelectedRepo}
                  selectedRepo={selectedRepo?.fullName ?? null}
                />
              </div>

              <div>
                <span className="mb-3 block font-mono-tabular text-xs" style={{ color: "var(--text-dim)" }}>
                  # profile notes
                </span>
                <NotesPanel
                  key={profile.user.login}
                  scopeKey={`profile:${profile.user.login}`}
                  fillHeight={false}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <CompareView />
      )}

      {selectedRepo && (
        <RepoDetailPanel
          repo={selectedRepo}
          onClose={() => setSelectedRepo(null)}
          messages={chatHistories[selectedRepo.fullName] ?? []}
          onMessagesChange={(messages) =>
            setChatHistories((prev) => ({ ...prev, [selectedRepo.fullName]: messages }))
          }
        />
      )}
    </main>
  );
}
