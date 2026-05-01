/**
 * src/routes/githubRoutes.ts
 *
 * GitHub-proxy endpoints. All routes require authentication.
 *
 * GET /api/github/repos?q=<search>&page=<n>
 *   Returns repos the authenticated user has access to, optionally filtered
 *   by a search query.  Uses GitHub's Search API when q is provided,
 *   otherwise lists the user's repos ordered by most recently pushed.
 *
 * Results are cached per-user in memory for 60 s to avoid hammering the
 * GitHub API on every keystroke.
 */
import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const router = Router();
router.use(requireAuth);

// ── In-memory caches ──────────────────────────────────────────────────────
const listCache = new Map<number, { ts: number; data: GithubRepo[] }>();
const LIST_TTL = 60_000; // 60 s

// Search cache: user_id → Map<query, {ts, data}>
const searchCache = new Map<
  number,
  Map<string, { ts: number; data: GithubRepo[] }>
>();
const SEARCH_TTL = 30_000; // 30 s

interface GithubRepo {
  id: number;
  full_name: string;
  clone_url: string;
  html_url: string;
  description: string | null;
  private: boolean;
  pushed_at: string | null;
}

interface GithubSearchResponse {
  items: GithubRepo[];
}

const GITHUB_HEADERS = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

/** Lists repos the user has access to (up to 1000, sorted by last push). */
async function fetchGithubRepos(token: string): Promise<GithubRepo[]> {
  const perPage = 100;
  const all: GithubRepo[] = [];
  let page = 1;

  while (page <= 10) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`,
      { headers: GITHUB_HEADERS(token) },
    );
    if (!res.ok) break;
    const batch = (await res.json()) as GithubRepo[];
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }

  return all;
}

/**
 * Searches GitHub repositories using the Search API.
 * The token grants access to private repos the user owns/collaborates on.
 */
async function searchGithubRepos(
  token: string,
  q: string,
): Promise<GithubRepo[]> {
  const res = await fetch(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=30&sort=updated`,
    { headers: GITHUB_HEADERS(token) },
  );
  if (!res.ok) return [];
  const body = (await res.json()) as GithubSearchResponse;
  return body.items ?? [];
}

router.get(
  "/repos",
  asyncHandler(async (req, res) => {
    const user = req.user as Express.User;
    const q = ((req.query.q as string) ?? "").trim();

    let repos: GithubRepo[];

    if (q.length >= 2) {
      // Use GitHub Search API — searches accessible repos by keyword
      const userMap =
        searchCache.get(user.id) ??
        new Map<string, { ts: number; data: GithubRepo[] }>();
      const cached = userMap.get(q);

      if (cached && Date.now() - cached.ts < SEARCH_TTL) {
        repos = cached.data;
      } else {
        repos = await searchGithubRepos(user.access_token, q);
        userMap.set(q, { ts: Date.now(), data: repos });
        searchCache.set(user.id, userMap);
      }
    } else {
      // No query — return recently-pushed repos from the user's list
      const cached = listCache.get(user.id);
      if (cached && Date.now() - cached.ts < LIST_TTL) {
        repos = cached.data;
      } else {
        repos = await fetchGithubRepos(user.access_token);
        listCache.set(user.id, { ts: Date.now(), data: repos });
      }
      // Narrow by single char if provided
      if (q.length === 1) {
        const term = q.toLowerCase();
        repos = repos.filter(
          (r) =>
            r.full_name.toLowerCase().includes(term) ||
            (r.description ?? "").toLowerCase().includes(term),
        );
      }
    }

    res.json({ data: repos.slice(0, 30) });
  }),
);

export default router;
