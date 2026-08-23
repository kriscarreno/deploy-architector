/**
 * src/utils/githubApi.ts
 *
 * Lightweight helpers over the GitHub REST API.
 *
 * Unlike gitHelper.ts (which clones repos to disk), these calls are plain
 * HTTP — cheap enough to run for every repo of every project on a list view.
 */

const GITHUB_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

/**
 * Extracts `owner/repo` from a GitHub URL.
 * Accepts both `https://github.com/owner/repo` and `...repo.git`.
 * @returns {string|null} `owner/repo`, or null if the URL isn't parseable.
 */
export function parseRepoSlug(githubUrl: string): string | null {
  try {
    const { pathname } = new URL(githubUrl);
    const parts = pathname.replace(/\.git$/, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return `${parts[0]}/${parts[1]}`;
  } catch (_) {
    return null;
  }
}

export interface BranchComparison {
  /** Commits in `head` not yet in `base` — what a deploy would push. */
  aheadBy: number;
  /** Commits in `base` not in `head` — direct commits on production. */
  behindBy: number;
}

/**
 * Compares two branches via `GET /repos/{slug}/compare/{base}...{head}`.
 *
 * Returns null when the comparison can't be resolved (repo or branch missing,
 * no permission, rate limited, network error) so callers can render an
 * "unknown" state instead of failing the whole request.
 */
export async function compareBranches(
  githubUrl: string,
  base: string,
  head: string,
  token: string,
  timeoutMs = 8000,
): Promise<BranchComparison | null> {
  const slug = parseRepoSlug(githubUrl);
  if (!slug) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://api.github.com/repos/${slug}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
      { headers: GITHUB_HEADERS(token), signal: controller.signal },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      ahead_by?: number;
      behind_by?: number;
    };
    return {
      aheadBy: body.ahead_by ?? 0,
      behindBy: body.behind_by ?? 0,
    };
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
