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
/** Aborts any in-progress rebase and swallows the error if there's nothing to abort. */
async function safeAbortRebase(git) {
  try {
    await git.rebase(["--abort"]);
  } catch (_) {
    /* no rebase in progress — ignore */
  }
}

/** Returns the list of conflicted files, or an empty array if none. */
async function conflictedFiles(git): Promise<string[]> {
  try {
    const status = await git.status();
    return status.conflicted ?? [];
  } catch (_) {
    return [];
  }
}

export async function mergeAndPush(
  git,
  { prodBranch, mainBranch, token, githubUrl },
) {
  const repoLabel = sanitiseUrl(githubUrl);
  const authUrl = buildAuthUrl(githubUrl, token);

  // Ensure the authenticated remote URL is set before any network operation
  await git.remote(["set-url", "origin", authUrl]);

  // 1. Checkout main and sync with origin
  await git.checkout(mainBranch);
  try {
    await git.pull(["--rebase"]);
  } catch (pullErr) {
    await safeAbortRebase(git);
    const files = await conflictedFiles(git);
    const detail = files.length
      ? `Conflicting files: ${files.join(", ")}`
      : pullErr.message;
    throw new Error(
      `[${repoLabel}] CONFLICT syncing ${mainBranch} with origin/${mainBranch}. ${detail}`,
    );
  }

  // 2. Rebase main onto production (incorporates any direct commits on prod)
  try {
    await git.pull(["--rebase", "origin", prodBranch]);
  } catch (rebaseErr) {
    const files = await conflictedFiles(git);
    await safeAbortRebase(git);
    const fileList = files.length
      ? `\nConflicting files:\n${files.map((f) => `  • ${f}`).join("\n")}`
      : `\nGit output: ${rebaseErr.message}`;
    throw new Error(
      `[${repoLabel}] CONFLICT rebasing ${mainBranch} onto ${prodBranch}.${fileList}`,
    );
  }

  // 3. Force-push main (rebase rewrote history)
  try {
    await git.push(["--force-with-lease", "origin", mainBranch]);
  } catch (pushErr) {
    throw new Error(
      `[${repoLabel}] ERROR force-pushing ${mainBranch} to origin: ${pushErr.message}`,
    );
  }

  // 4. Advance production to main via fast-forward refspec (no checkout needed)
  try {
    await git.push(["origin", `${mainBranch}:${prodBranch}`]);
  } catch (pushErr) {
    throw new Error(
      `[${repoLabel}] ERROR advancing ${prodBranch} to ${mainBranch}: ${pushErr.message}`,
    );
  }
}
