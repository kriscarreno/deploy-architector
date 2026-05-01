/**
 * src/utils/gitHelper.js
 *
 * Thin wrapper around simple-git that builds an authenticated remote URL
 * and provides high-level methods used by the deploy worker.
 *
 * Authentication uses the token-in-URL pattern supported by GitHub:
 *   https://x-access-token:{token}@github.com/owner/repo.git
 *
 * SECURITY: The token is never logged — we pass `sanitised` URLs to logs.
 */
import { simpleGit } from "simple-git";
import path from "path";
import fs from "fs";
import { env } from "../config/env.js";

/**
 * Builds an authenticated HTTPS remote URL.
 * @param {string} githubUrl  e.g. https://github.com/owner/repo
 * @param {string} token      GitHub OAuth access token
 * @returns {string}
 */
export function buildAuthUrl(githubUrl, token) {
  const url = new URL(
    githubUrl.endsWith(".git") ? githubUrl : `${githubUrl}.git`,
  );
  url.username = "x-access-token";
  url.password = token;
  return url.toString();
}

/** Returns a sanitised URL safe for logging (no token). */
export function sanitiseUrl(githubUrl) {
  const url = new URL(
    githubUrl.endsWith(".git") ? githubUrl : `${githubUrl}.git`,
  );
  return `${url.host}${url.pathname}`;
}

/**
 * Returns the local clone path for a repo.
 * Convention: {REPOS_BASE_DIR}/{repoId}
 */
export function localPath(repoId) {
  return path.resolve(env.REPOS_BASE_DIR, String(repoId));
}

/**
 * Ensures the base repos directory exists.
 */
export function ensureReposDir() {
  if (!fs.existsSync(path.resolve(env.REPOS_BASE_DIR))) {
    fs.mkdirSync(path.resolve(env.REPOS_BASE_DIR), { recursive: true });
  }
}

/**
 * Clones a repo if not already cloned, otherwise fetches all remotes.
 *
 * @param {object} repo   - Row from `repos` table
 * @param {string} token  - GitHub access token
 * @returns {SimpleGit}   - Configured simple-git instance
 */
export async function cloneOrFetch(repo, token) {
  ensureReposDir();

  const clonePath = localPath(repo.id);
  const authUrl = buildAuthUrl(repo.github_url, token);

  if (!fs.existsSync(clonePath)) {
    await simpleGit().clone(authUrl, clonePath);
  } else {
    const repoGit = simpleGit(clonePath);
    await repoGit.remote(["set-url", "origin", authUrl]);
    await repoGit.fetch(["--all", "--prune"]);
  }

  // Ensure git identity is always set — required for merge/rebase commits
  // inside Docker containers where global git config doesn't exist.
  const git = simpleGit(clonePath);
  await git.addConfig("user.email", "deploy-bot@deploy-architector.local");
  await git.addConfig("user.name", "Deploy Architector");

  return git;
}

/**
 * Performs the production merge:
 *  1. Checkout prod branch
 *  2. Reset to remote prod (ensure clean state)
 *  3. Merge main → prod with --no-ff (creates a merge commit)
 *  4. Push
 *
 * Throws on merge conflict so the caller can record the failure.
 *
 * @param {SimpleGit}  git
 * @param {string}     prodBranch  e.g. 'production'
 * @param {string}     mainBranch  e.g. 'main'
 * @param {string}     token       GitHub token (needed for push auth)
 * @param {string}     githubUrl
 */
export async function mergeAndPush(
  git,
  { prodBranch, mainBranch, token, githubUrl },
) {
  const authUrl = buildAuthUrl(githubUrl, token);

  // Ensure the authenticated remote URL is set before any network operation
  await git.remote(["set-url", "origin", authUrl]);

  // 1. git checkout {prod_branch}
  await git.checkout(prodBranch);

  // 2. git pull -r  (rebase local prod onto origin/prod)
  try {
    await git.pull(["--rebase"]);
  } catch (pullErr) {
    try {
      await git.rebase(["--abort"]);
    } catch (_) {
      /* already clean */
    }
    throw pullErr;
  }

  // 3. git pull -r origin {main_branch}  (rebase prod onto main)
  try {
    await git.pull(["--rebase", "origin", mainBranch]);
  } catch (rebaseErr) {
    try {
      await git.rebase(["--abort"]);
    } catch (_) {
      /* already clean */
    }
    throw rebaseErr;
  }

  // 4. git push -f
  await git.push(["--force"]);
}
