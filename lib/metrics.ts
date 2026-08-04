import { GitHubProfile, UserMetrics } from "./types";

export function buildMetrics(profile: GitHubProfile, commitsLastYear: number): UserMetrics {
  const { user, repos } = profile;
  const ownRepos = repos.filter((r) => !r.isFork);

  const totalStars = ownRepos.reduce((sum, r) => sum + r.stars, 0);
  const totalForks = ownRepos.reduce((sum, r) => sum + r.forks, 0);

  const languageCounts = new Map<string, number>();
  for (const repo of ownRepos) {
    if (!repo.language) continue;
    languageCounts.set(repo.language, (languageCounts.get(repo.language) || 0) + 1);
  }
  const mostUsedLanguages = [...languageCounts.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const accountAgeYears =
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365);

  return {
    username: user.login,
    totalRepos: ownRepos.length,
    totalStars,
    totalForks,
    followers: user.followers,
    following: user.following,
    avgStarsPerRepo: ownRepos.length ? totalStars / ownRepos.length : 0,
    mostUsedLanguages,
    commitsLastYear,
    accountAgeYears: Math.round(accountAgeYears * 10) / 10,
  };
}
