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

// ── Simple in-memory cache (user_id → {ts, data}) ────────────────────────
const cache = new Map<number, { ts: number; data: GithubRepo[] }>();
const TTL = 60_000; // 60 s

interface GithubRepo {
  id: number;
  full_name: string;
  clone_url: string;
  html_url: string;
  description: string | null;
  private: boolean;
  pushed_at: string | null;
}

async function fetchGithubRepos(token: string): Promise<GithubRepo[]> {
  const perPage = 100;
  let page = 1;
  const all: GithubRepo[] = [];

  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );

    if (!res.ok) break;

    const batch = (await res.json()) as GithubRepo[];
    if (batch.length === 0) break;

    all.push(...batch);

    // Stop if we got less than a full page (last page)
    if (batch.length < perPage) break;

    // Cap at 5 pages (500 repos) to avoid very slow responses
    if (page >= 5) break;

    page++;
  }

  return all;
}

router.get(
  "/repos",
  asyncHandler(async (req, res) => {
    const user = req.user as Express.User;
    const q = ((req.query.q as string) ?? "").toLowerCase().trim();

    // Serve from cache if fresh
    const cached = cache.get(user.id);
    let repos: GithubRepo[];

    if (cached && Date.now() - cached.ts < TTL) {
      repos = cached.data;
    } else {
      repos = await fetchGithubRepos(user.access_token);
      cache.set(user.id, { ts: Date.now(), data: repos });
    }

    // Filter by query (matches name or description)
    const filtered = q
      ? repos.filter(
          (r) =>
            r.full_name.toLowerCase().includes(q) ||
            (r.description ?? "").toLowerCase().includes(q),
        )
      : repos;

    // Return max 20 suggestions
    res.json({ data: filtered.slice(0, 20) });
  }),
);

export default router;
