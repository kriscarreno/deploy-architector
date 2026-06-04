/**
 * src/workers/deployWorker.js
 *
 * Standalone process — run with:
 *   node src/workers/deployWorker.js
 *
 * Listens to the Bull `deploy` queue.
 * For every job it:
 *  1. Marks the deploy_log as `running`
 *  2. Loads the project and its repos (ordered by order_index)
 *  3. For each repo (in order):
 *     a. Acquires a Redis-backed lock for that repo
 *     b. Clones or fetches the repo using the user's token
 *     c. Merges main → production and pushes
 *     d. Releases the lock
 *     e. On failure: if atomic=true → abort remaining repos; else → continue
 *  4. Marks the deploy_log as `success` or `failed`/`conflict`
 *
 * The worker is deliberately isolated from the HTTP server so it can
 * be scaled independently and restarted without affecting the API.
 */

// Load environment variables first — worker has no app.js bootstrap
import { config } from "dotenv";
config();

import fs from "fs";
import path from "path";
import { deployQueue } from "../queues/deployQueue.js";
import { DeployLogRepository } from "../repositories/DeployLogRepository.js";
import { ProjectRepository } from "../repositories/ProjectRepository.js";
import { RepoRepository } from "../repositories/RepoRepository.js";
import { RepoEnvFileRepository } from "../repositories/RepoEnvFileRepository.js";
import { UserRepository } from "../repositories/UserRepository.js";
import { LockService } from "../services/LockService.js";
import {
  cloneOrFetch,
  mergeAndPush,
  getDiffSummary,
  localPath,
} from "../utils/gitHelper.js";
import logger from "../config/logger.js";
import redisClient from "../config/redis.js";
import { deployChannel } from "../config/redisSub.js";

// Instantiate repositories (no DI container — worker is simple enough)
const deployLogRepo = new DeployLogRepository();
const projectRepo = new ProjectRepository();
const repoRepo = new RepoRepository();
const repoEnvFileRepo = new RepoEnvFileRepository();
const userRepo = new UserRepository();
const lockService = new LockService();

// Concurrency: process one job at a time per worker instance.
// Scale horizontally by running multiple worker processes.
const CONCURRENCY = 1;

deployQueue.process(CONCURRENCY, async (job) => {
  const { projectId, userId, jobId, repoIds } = job.data;

  logger.info("Deploy job started", { jobId, projectId, userId });

  // ── 1. Mark as running ────────────────────────────────────────────────
  await deployLogRepo.updateStatus(jobId, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  const logLines: string[] = [];
  const channel = deployChannel(jobId);
  const log = (msg: string) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    logLines.push(line);
    logger.info(msg, { jobId });
    // Fire-and-forget: publish to SSE subscribers
    redisClient
      .publish(channel, JSON.stringify({ type: "log", line }))
      .catch(() => {});
  };

  try {
    // ── 2. Load project and user ────────────────────────────────────────
    const project = await projectRepo.findById(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const user = await userRepo.findById(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    let repos = await repoRepo.findAllByProject(projectId);

    // Filter to specific repos if provided (manual selection)
    if (Array.isArray(repoIds) && repoIds.length > 0) {
      const selected = new Set(repoIds);
      repos = repos.filter((r) => selected.has(r.id));
    }

    if (repos.length === 0) {
      log("No repos configured — nothing to deploy");
      await deployLogRepo.updateStatus(jobId, {
        status: "success",
        finishedAt: new Date().toISOString(),
        log: logLines.join("\n"),
      });
      return;
    }

    log(`Deploying ${repos.length} repo(s) for project "${project.name}"`);

    let overallStatus = "success";

    // ── 3. Process repos in order ───────────────────────────────────────
    for (const repo of repos) {
      log(`[${repo.name}] Starting — ${repo.github_url}`);

      // a. Acquire lock
      const lockAcquired = await lockService.acquire(repo.id, jobId);
      if (!lockAcquired) {
        const msg = `[${repo.name}] Lock not acquired — skipping (another job is running)`;
        log(msg);
        if (project.atomic) {
          overallStatus = "failed";
          break;
        }
        continue;
      }

      try {
        // b. Clone or fetch
        log(`[${repo.name}] Fetching...`);
        const git = await cloneOrFetch(repo, user.access_token);

        // Update local_path in DB if this was a fresh clone
        const lp = localPath(repo.id);
        await repoRepo.updateLocalPath(repo.id, lp);

        // c. Write registered env files for the prod branch to disk
        const envFiles = repoEnvFileRepo.findAllByRepoAndBranch(
          repo.id,
          repo.prod_branch,
        );
        if (envFiles.length > 0) {
          log(
            `[${repo.name}] Writing ${envFiles.length} env file(s) for branch "${repo.prod_branch}"...`,
          );
          for (const envFile of envFiles) {
            const filePath = path.join(lp, envFile.filename);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, envFile.content, "utf8");
            log(`[${repo.name}] Written: ${envFile.filename}`);
          }
        }

        // d. Rebase prod onto main and force-push
        // Show diff summary before deploying
        const diff = await getDiffSummary(
          git,
          repo.main_branch,
          repo.prod_branch,
        );
        log(`[${repo.name}] Diff summary:\n${diff}`);

        // c. Rebase main onto prod and fast-forward prod
        log(
          `[${repo.name}] Rebasing ${repo.main_branch} onto ${repo.prod_branch} and advancing ${repo.prod_branch}...`,
        );
        await mergeAndPush(git, {
          prodBranch: repo.prod_branch,
          mainBranch: repo.main_branch,
          token: user.access_token,
          githubUrl: repo.github_url,
        });

        log(`[${repo.name}] ✓ Deployed successfully`);
      } catch (repoErr) {
        const isConflict =
          repoErr.message?.toLowerCase().includes("conflict") ||
          repoErr.message?.toLowerCase().includes("merge");

        log(
          `[${repo.name}] ✗ ${isConflict ? "CONFLICT" : "ERROR"}: ${repoErr.message}`,
        );
        logger.error("Repo deploy error", {
          jobId,
          repoId: repo.id,
          repoName: repo.name,
          err: repoErr.message,
        });

        overallStatus = isConflict ? "conflict" : "failed";

        // d. If atomic, stop processing remaining repos
        if (project.atomic) {
          log("Project is atomic — aborting remaining repos");
          break;
        }
        // Non-atomic: log the failure and continue with the next repo
      } finally {
        // e. Always release the lock
        await lockService.release(repo.id, jobId);
      }
    }

    // ── 4. Finalise ───────────────────────────────────────────────────
    log(`Deploy finished with status: ${overallStatus}`);
    await deployLogRepo.updateStatus(jobId, {
      status: overallStatus,
      finishedAt: new Date().toISOString(),
      log: logLines.join("\n"),
    });
    // Publish done AFTER DB is updated so clients that re-fetch see the final log
    redisClient
      .publish(channel, JSON.stringify({ type: "done", status: overallStatus }))
      .catch(() => {});
  } catch (err) {
    logger.error("Deploy job fatal error", {
      jobId,
      err: err.message,
      stack: err.stack,
    });
    const fatalLine = `[FATAL] ${err.message}`;
    logLines.push(fatalLine);
    redisClient
      .publish(channel, JSON.stringify({ type: "log", line: fatalLine }))
      .catch(() => {});

    await deployLogRepo.updateStatus(jobId, {
      status: "failed",
      finishedAt: new Date().toISOString(),
      log: logLines.join("\n"),
    });
    redisClient
      .publish(channel, JSON.stringify({ type: "done", status: "failed" }))
      .catch(() => {});

    // Re-throw so Bull marks the job as failed
    throw err;
  }
});

logger.info('Deploy worker listening on queue "deploy"');

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`Worker received ${signal}, shutting down gracefully...`);
  await deployQueue.close();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
