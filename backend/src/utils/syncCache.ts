/**
 * src/utils/syncCache.ts
 *
 * In-memory, per-user cache for the projects sync summary.
 *
 * The summary costs one GitHub API call per repo, so the projects list would
 * otherwise re-issue dozens of requests on every navigation. Same pattern as
 * the repo-list cache in githubRoutes.ts.
 *
 * A deploy changes the answer, so the SSE handler invalidates the user's entry
 * as soon as a job reports `done`.
 */

const TTL_MS = 60_000;

const cache = new Map<number, { ts: number; data: unknown }>();

/** Returns the cached value for a user, or null when absent or stale. */
export function getCached<T>(userId: number): T | null {
  const hit = cache.get(userId);
  if (!hit) return null;
  if (Date.now() - hit.ts > TTL_MS) {
    cache.delete(userId);
    return null;
  }
  return hit.data as T;
}

export function setCached(userId: number, data: unknown): void {
  cache.set(userId, { ts: Date.now(), data });
}

/** Drops a user's entry — called when a deploy finishes. */
export function invalidate(userId: number): void {
  cache.delete(userId);
}
