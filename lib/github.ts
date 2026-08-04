import { GitHubProfile, GitHubRepo, GitHubUser, RepoContext } from "./types";

const GITHUB_API = "https://api.github.com";

// Minimal shapes of GitHub's raw API responses — just the fields we
// actually read. GitHub returns far more than this on every endpoint.
interface RawGitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  html_url: string;
}

interface RawGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  updated_at: string;
  created_at: string;
  fork: boolean;
  default_branch?: string;
}

interface RawTreeEntry {
  path: string;
}

interface RawCommit {
  commit?: {
    message?: string;
    author?: { date?: string; name?: string };
  };
}

// A token is optional but bumps the rate limit from 60/hr to 5000/hr.
// Set GITHUB_TOKEN in .env.local for real usage.
function githubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

// Thrown for any non-2xx GitHub response so route handlers can
// map it to the right HTTP status instead of a generic 500.
export class GitHubApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "GitHubApiError";
  }
}

async function githubFetch(path: string): Promise<unknown> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: githubHeaders(),
    // GitHub profile data changes slowly enough that a short cache
    // avoids hammering the API while someone clicks around the UI.
    next: { revalidate: 60 },
  });

  if (res.status === 404) {
    throw new GitHubApiError(404, "GitHub user or resource not found");
  }
  if (res.status === 403) {
    throw new GitHubApiError(403, "GitHub API rate limit exceeded, try again shortly");
  }
  if (!res.ok) {
    throw new GitHubApiError(res.status, `GitHub API error (${res.status})`);
  }
  return res.json();
}

function mapUser(raw: RawGitHubUser): GitHubUser {
  return {
    login: raw.login,
    name: raw.name,
    avatarUrl: raw.avatar_url,
    bio: raw.bio,
    company: raw.company,
    location: raw.location,
    blog: raw.blog || null,
    publicRepos: raw.public_repos,
    followers: raw.followers,
    following: raw.following,
    createdAt: raw.created_at,
    htmlUrl: raw.html_url,
  };
}

function mapRepo(raw: RawGitHubRepo): GitHubRepo {
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    description: raw.description,
    htmlUrl: raw.html_url,
    language: raw.language,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    watchers: raw.watchers_count,
    openIssues: raw.open_issues_count,
    updatedAt: raw.updated_at,
    createdAt: raw.created_at,
    isFork: raw.fork,
  };
}

export async function getUser(username: string): Promise<GitHubUser> {
  const raw = (await githubFetch(`/users/${encodeURIComponent(username)}`)) as RawGitHubUser;
  return mapUser(raw);
}

// GitHub paginates repos at 100/page. We pull up to 300 (3 pages),
// which comfortably covers the vast majority of profiles.
export async function getRepos(username: string): Promise<GitHubRepo[]> {
  const perPage = 100;
  const maxPages = 3;
  const all: GitHubRepo[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const raw = (await githubFetch(
      `/users/${encodeURIComponent(username)}/repos?per_page=${perPage}&page=${page}&sort=updated`
    )) as RawGitHubRepo[];
    all.push(...raw.map(mapRepo));
    if (raw.length < perPage) break;
  }

  return all;
}

export async function getProfile(username: string): Promise<GitHubProfile> {
  const [user, repos] = await Promise.all([getUser(username), getRepos(username)]);
  return { user, repos };
}

// Best-effort README fetch. Not every repo has one, and GitHub
// returns 404 in that case, which we just treat as "no readme".
async function getReadme(owner: string, repo: string): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, {
      headers: { ...githubHeaders(), Accept: "application/vnd.github.raw+json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Keep prompts a reasonable size — long readmes get truncated.
    return text.slice(0, 6000);
  } catch {
    return null;
  }
}

// Flat list of paths at the repo root plus one level deep, used to
// give the AI chat a sense of the project's structure without
// dumping the entire tree.
async function getFileTree(owner: string, repo: string): Promise<string[]> {
  try {
    const branchInfo = (await githubFetch(`/repos/${owner}/${repo}`)) as RawGitHubRepo;
    const defaultBranch = branchInfo.default_branch || "main";
    const raw = (await githubFetch(
      `/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
    )) as { tree?: RawTreeEntry[] };
    const paths: string[] = (raw.tree || [])
      .map((entry) => entry.path)
      .filter((p) => p.split("/").length <= 2);
    return paths.slice(0, 150);
  } catch {
    return [];
  }
}

async function getRecentCommits(
  owner: string,
  repo: string
): Promise<{ message: string; date: string; author: string }[]> {
  try {
    const raw = (await githubFetch(
      `/repos/${owner}/${repo}/commits?per_page=10`
    )) as RawCommit[];
    return raw.map((c) => ({
      message: (c.commit?.message || "").split("\n")[0],
      date: c.commit?.author?.date || "",
      author: c.commit?.author?.name || "unknown",
    }));
  } catch {
    return [];
  }
}

// Pulls everything the AI chat needs to answer questions about one
// specific repo, grounded in real repo content rather than the
// model's general knowledge.
export async function getRepoContext(owner: string, repo: string): Promise<RepoContext> {
  const [details, readme, fileTree, recentCommits] = await Promise.all([
    githubFetch(`/repos/${owner}/${repo}`) as Promise<RawGitHubRepo>,
    getReadme(owner, repo),
    getFileTree(owner, repo),
    getRecentCommits(owner, repo),
  ]);

  return {
    fullName: details.full_name,
    description: details.description,
    readme,
    fileTree,
    recentCommits,
    language: details.language,
    stars: details.stargazers_count,
  };
}

// Commits authored by `username` across all their repos in the last
// year. GitHub's search API is the only endpoint that lets us query
// this without walking every repo's commit history ourselves.
export async function getCommitsLastYear(username: string): Promise<number> {
  const since = new Date();
  since.setFullYear(since.getFullYear() - 1);
  const sinceStr = since.toISOString().split("T")[0];

  try {
    const raw = (await githubFetch(
      `/search/commits?q=author:${encodeURIComponent(username)}+committer-date:>${sinceStr}`
    )) as { total_count?: number };
    return raw.total_count ?? 0;
  } catch {
    // Search API has a lower, separate rate limit and can fail
    // independently of the rest of the app — degrade gracefully.
    return 0;
  }
}
