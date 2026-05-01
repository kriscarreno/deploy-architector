/**
 * src/routes/githubRoutes.ts
 *
 * GitHub-proxy endpoints. All routes require authentication.
 *
 * GET /api/github/repos?q=<search>
 *   Returns repos the authenticated user has access to (owner, collaborator,
 *   organisation member), optionally filtered by a local keyword search.
 *   Results are never mixed with unrelated public repos.
 *
 * The repo list is cached per-user in memory for 60 s to avoid hammering the
 * GitHub API on every keystroke.
 */
import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const router = Router();
router.use(requireAuth);

// ── In-memory cache ─────────────────────────────────────────────────────
const listCache = new Map<number, { ts: number; data: GithubRepo[] }>();
const LIST_TTL = 60_000; // 60 s

interface GithubRepo {
  id: number;
  full_name: string;
  clone_url: string;
  html_url: string;
  description: string | null;
  private: boolean;
  pushed_at: string | null;
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

router.get(
  "/repos",
  asyncHandler(async (req, res) => {
    const user = req.user as Express.User;
    const q = ((req.query.q as string) ?? "").trim();

    // Always fetch the user's accessible repos (owner + collaborator + org member).
    // This list is cached for LIST_TTL so subsequent searches are instant.
    let repos: GithubRepo[];
    const cached = listCache.get(user.id);
    if (cached && Date.now() - cached.ts < LIST_TTL) {
      repos = cached.data;
    } else {
      repos = await fetchGithubRepos(user.access_token);
      listCache.set(user.id, { ts: Date.now(), data: repos });
    }

    // Filter locally so results are always scoped to the user's repos.
    if (q.length > 0) {
      const term = q.toLowerCase();
      repos = repos.filter(
        (r) =>
          r.full_name.toLowerCase().includes(term) ||
          (r.description ?? "").toLowerCase().includes(term),
      );
    }

    res.json({ data: repos.slice(0, 30) });
  }),
);

export default router;
