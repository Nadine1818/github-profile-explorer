import { GitHubUser } from "@/lib/types";
import { formatCount } from "@/lib/format";

export default function ProfileHeader({ user }: { user: GitHubUser }) {
  const joined = new Date(user.createdAt).getFullYear();

  return (
    <div className="fade-up flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={user.avatarUrl}
        alt={`${user.login}'s avatar`}
        width={96}
        height={96}
        className="h-24 w-24 shrink-0 rounded-md border"
        style={{ borderColor: "var(--border)" }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
            {user.name || user.login}
          </h1>
          <a
            href={user.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono-tabular text-sm hover:underline"
            style={{ color: "var(--accent)" }}
          >
            @{user.login}
          </a>
        </div>

        {user.bio && (
          <p className="mt-1 max-w-2xl text-sm" style={{ color: "var(--text-muted)" }}>
            {user.bio}
          </p>
        )}

        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono-tabular text-xs" style={{ color: "var(--text-dim)" }}>
          <div>
            <dt className="inline">repos </dt>
            <dd className="inline" style={{ color: "var(--text-muted)" }}>
              {formatCount(user.publicRepos)}
            </dd>
          </div>
          <div>
            <dt className="inline">followers </dt>
            <dd className="inline" style={{ color: "var(--text-muted)" }}>
              {formatCount(user.followers)}
            </dd>
          </div>
          <div>
            <dt className="inline">following </dt>
            <dd className="inline" style={{ color: "var(--text-muted)" }}>
              {formatCount(user.following)}
            </dd>
          </div>
          {user.location && (
            <div>
              <dt className="inline">loc </dt>
              <dd className="inline" style={{ color: "var(--text-muted)" }}>
                {user.location}
              </dd>
            </div>
          )}
          <div>
            <dt className="inline">joined </dt>
            <dd className="inline" style={{ color: "var(--text-muted)" }}>
              {joined}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
