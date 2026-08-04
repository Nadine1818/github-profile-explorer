import { GitHubRepo } from "@/lib/types";
import { formatCount, formatRelativeDate } from "@/lib/format";

// A small, deliberately limited set — enough to differentiate the
// common languages at a glance without turning the grid into a
// rainbow. Anything unlisted falls back to text-dim.
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3b82f6",
  JavaScript: "#e8c34d",
  Python: "#4fa8d8",
  Go: "#4dd8c4",
  Rust: "#e8843d",
  Java: "#e08a3d",
  "C++": "#e87a7a",
  C: "#8b93a6",
  Ruby: "#e5707a",
  Swift: "#e8843d",
  HTML: "#e5704f",
  CSS: "#5f7fb8",
  Shell: "#7fbf7f",
};

function languageColor(lang: string | null): string {
  if (!lang) return "var(--text-dim)";
  return LANGUAGE_COLORS[lang] ?? "var(--text-muted)";
}

interface RepoGridProps {
  repos: GitHubRepo[];
  onSelect: (repo: GitHubRepo) => void;
  selectedRepo: string | null;
}

export default function RepoGrid({ repos, onSelect, selectedRepo }: RepoGridProps) {
  if (repos.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>
        No public repositories.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {repos.map((repo, i) => (
        <button
          key={repo.id}
          onClick={() => onSelect(repo)}
          className="fade-up group flex flex-col gap-2 rounded-md border p-4 text-left transition-colors"
          style={{
            borderColor: selectedRepo === repo.fullName ? "var(--accent)" : "var(--border)",
            background: "var(--surface)",
            animationDelay: `${Math.min(i, 10) * 30}ms`,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <span
              className="truncate font-mono-tabular text-sm font-medium"
              style={{ color: "var(--text)" }}
            >
              {repo.name}
            </span>
            {repo.isFork && (
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px]"
                style={{ color: "var(--text-dim)", border: "1px solid var(--border)" }}
              >
                fork
              </span>
            )}
          </div>

          <p
            className="line-clamp-2 min-h-[2.5em] text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {repo.description || "No description."}
          </p>

          <div
            className="flex items-center gap-3 font-mono-tabular text-[11px]"
            style={{ color: "var(--text-dim)" }}
          >
            {repo.language && (
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: languageColor(repo.language) }}
                />
                {repo.language}
              </span>
            )}
            <span>★ {formatCount(repo.stars)}</span>
            <span>⑂ {formatCount(repo.forks)}</span>
            <span className="ml-auto group-hover:opacity-100 opacity-0 transition-opacity" style={{ color: "var(--accent)" }}>
              open →
            </span>
          </div>

          <span
            className="font-mono-tabular text-[10px]"
            style={{ color: "var(--text-dim)" }}
          >
            updated {formatRelativeDate(repo.updatedAt)}
          </span>
        </button>
      ))}
    </div>
  );
}
