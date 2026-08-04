// Prefixed onto error text sent through the /api/chat stream so the
// client can render it as an error bubble instead of a normal AI
// answer. The stream itself is plain text with no structure, so this
// is a simple way to flag "this content isn't a real model response"
// without changing the wire format. Unlikely to ever appear in real
// model output, which is all that matters for a sentinel like this.
export const CHAT_ERROR_MARKER = "@@CHAT_ERROR@@";

// Shape of the data we actually use from GitHub's user endpoint.
// GitHub returns a lot more than this; we only keep what the UI needs.
export interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;
  htmlUrl: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  language: string | null;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  updatedAt: string;
  createdAt: string;
  isFork: boolean;
}

// A profile bundles the user with their repos so the frontend
// can request everything about a username in one call.
export interface GitHubProfile {
  user: GitHubUser;
  repos: GitHubRepo[];
}

// Derived numbers used for the "compare two users" feature.
// These aren't returned directly by GitHub, we compute them
// from the repo list and a commit-activity lookup.
export interface UserMetrics {
  username: string;
  totalRepos: number;
  totalStars: number;
  totalForks: number;
  followers: number;
  following: number;
  avgStarsPerRepo: number;
  mostUsedLanguages: { language: string; count: number }[];
  commitsLastYear: number;
  accountAgeYears: number;
}

export interface CompareResult {
  userA: UserMetrics;
  userB: UserMetrics;
}

export interface RepoNote {
  id: string;
  repoFullName: string;
  text: string;
  createdAt: string;
}

// Minimal shape of a chat message as stored client-side and
// sent to the /api/chat route.
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Context we pull from a repo to ground the chat/summary answers,
// instead of letting the model guess from its training data.
export interface RepoContext {
  fullName: string;
  description: string | null;
  readme: string | null;
  fileTree: string[];
  recentCommits: { message: string; date: string; author: string }[];
  language: string | null;
  stars: number;
}