/**
 * src/services/LockService.js
 *
 * Provides per-repo distributed locks backed by Redis SET NX EX.
 * Prevents two concurrent jobs from operating on the same local repo
 * at the same time (race conditions on the filesystem and git state).
 *
 * Usage:
 *   const lock = await lockService.acquire(repoId, jobId);
 *   try { ... } finally { await lockService.release(repoId, jobId); }
 */
import redisClient from "../config/redis.js";
import logger from "../config/logger.js";

const LOCK_TTL_SECONDS = 300; // 5 minutes max per repo operation
const LOCK_PREFIX = "deploy:lock:repo:";

export class LockService {
  /**
   * Tries to acquire an exclusive lock for a repo.
   *
   * @param {number|string} repoId
   * @param {string}        jobId   - Used as the lock value so only the owner can release it
   * @returns {Promise<boolean>}    - true if lock acquired, false if already locked
   */
  async acquire(repoId, jobId) {
    const key = `${LOCK_PREFIX}${repoId}`;
    // SET key value NX EX ttl — atomic acquire
    const result = await redisClient.set(
      key,
      jobId,
      "EX",
      LOCK_TTL_SECONDS,
      "NX",
    );

    if (result === "OK") {
      logger.debug("Lock acquired", { repoId, jobId });
      return true;
    }

    logger.warn("Lock not acquired — repo already locked", { repoId, jobId });
    return false;
  }

  /**
   * Releases the lock only if the current holder matches jobId (Lua CAS).
   */
  async release(repoId, jobId) {
    const key = `${LOCK_PREFIX}${repoId}`;
    // Atomic compare-and-delete via Lua
    const luaScript = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
    const released = await redisClient.eval(luaScript, 1, key, jobId);
    logger.debug("Lock released", { repoId, jobId, released });
    return released === 1;
  }

  /**
   * Checks whether a repo is currently locked.
   */
  async isLocked(repoId) {
    const val = await redisClient.get(`${LOCK_PREFIX}${repoId}`);
    return val !== null;
  }
}
