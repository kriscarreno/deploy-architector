/**
 * src/services/DeployService.js
 *
 * Business-logic layer for deployments.
 * Responsible for:
 *  - Verifying project access (RBAC)
 *  - Creating a deploy_log record
 *  - Enqueuing the Bull job
 *  - Returning job status
 */
import type { ProjectRepository } from "../repositories/ProjectRepository.js";
import type { DeployLogRepository } from "../repositories/DeployLogRepository.js";
import type { RepoRepository } from "../repositories/RepoRepository.js";
import type { UserRepository } from "../repositories/UserRepository.js";
import type Bull from "bull";
import type { Queue } from "bull";
import { v4 as uuidv4 } from "uuid";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";
import logger from "../config/logger.js";

export class DeployService {
  private projectRepo: ProjectRepository;
  private deployLogRepo: DeployLogRepository;
  private repoRepo: RepoRepository;
  private userRepo: UserRepository;
  private deployQueue: Queue<{
    projectId: number;
    userId: number;
    jobId: string;
  }>;

  constructor(
    projectRepo: ProjectRepository,
    deployLogRepo: DeployLogRepository,
    deployQueue: Queue<{ projectId: number; userId: number; jobId: string }>,
    repoRepo: RepoRepository,
    userRepo: UserRepository,
  ) {
    this.projectRepo = projectRepo;
    this.deployLogRepo = deployLogRepo;
    this.deployQueue = deployQueue;
    this.repoRepo = repoRepo;
    this.userRepo = userRepo;
  }

  /**
   * Enqueues a deploy job and creates the log entry.
   * @returns {{ jobId: string, logEntry: object }}
   */
  async enqueueDeploy(projectId, userId) {
    // RBAC check
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");

    const member = await this.projectRepo.isMember(projectId, userId);
    if (!member) throw new ForbiddenError();

    const jobId = uuidv4();

    // Persist the log entry first so it exists before the worker picks it up
    const logEntry = await this.deployLogRepo.create({
      projectId,
      userId,
      jobId,
    });

    // Add to Bull queue — worker will update the log as it progresses
    await this.deployQueue.add(
      { projectId, userId, jobId },
      {
        jobId, // Use our jobId as the Bull job id for easy lookup
        attempts: 1, // No automatic retries — deploy is not idempotent
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    logger.info("Deploy enqueued", { projectId, userId, jobId });
    return { jobId, logEntry };
  }

  /**
   * Returns the Bull job status combined with the deploy log.
   */
  async getJobStatus(jobId, userId) {
    const logEntry = await this.deployLogRepo.findByJobId(jobId);
    if (!logEntry) throw new NotFoundError("Job not found");

    // Ensure caller has access to the project this job belongs to
    const member = await this.projectRepo.isMember(logEntry.project_id, userId);
    if (!member) throw new ForbiddenError();

    // Fetch Bull job for queue-level metadata (progress, attempts, etc.)
    const bullJob = await this.deployQueue.getJob(jobId);
    const bullState = bullJob ? await bullJob.getState() : null;

    return { ...logEntry, bullState };
  }

  /**
   * Returns deployment history for a project.
   */
  async getDeployHistory(projectId, userId, pagination) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");

    const member = await this.projectRepo.isMember(projectId, userId);
    if (!member) throw new ForbiddenError();

    return this.deployLogRepo.findByProject(projectId, pagination);
  }

  /**
   * Returns all deploy history across all projects for the user.
   */
  async getGlobalHistory(userId, pagination) {
    return this.deployLogRepo.findByUser(userId, pagination);
  }

  /**
   * Triggers a GitHub Actions workflow_dispatch event for all repos in a
   * project on the specified branch. Runs GitHub CI/CD exactly like a
   * manual trigger from the GitHub UI.
   *
   * @returns Array of per-repo results { repoId, name, success, status }
   */
  async dispatchWorkflow(projectId: number, userId: number, branch: string) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");

    const member = await this.projectRepo.isMember(projectId, userId);
    if (!member) throw new ForbiddenError();

    const repos = await this.repoRepo.findAllByProject(projectId);
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    const results = await Promise.all(
      repos.map(async (repo) => {
        const repoUrl = repo.github_url.endsWith(".git")
          ? repo.github_url
          : `${repo.github_url}.git`;
        const url = new URL(repoUrl);
        const parts = url.pathname.split("/").filter(Boolean);
        const owner = parts[0];
        const repoName = parts[1]?.replace(/\.git$/, "");

        const workflowFile = repo.workflow_file || "deploy.yml";

        try {
          const resp = await fetch(
            `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowFile}/dispatches`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${user.access_token}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ ref: branch }),
            },
          );

          const success = resp.status === 204;
          if (!success) {
            const body = await resp.text().catch(() => "");
            logger.warn("workflow_dispatch failed", {
              repoId: repo.id,
              status: resp.status,
              body,
            });
          }
          return {
            repoId: repo.id,
            name: repo.name,
            success,
            httpStatus: resp.status,
          };
        } catch (err: any) {
          logger.error("workflow_dispatch error", {
            repoId: repo.id,
            err: err.message,
          });
          return {
            repoId: repo.id,
            name: repo.name,
            success: false,
            httpStatus: 0,
          };
        }
      }),
    );

    logger.info("workflow_dispatch triggered", { projectId, userId, branch });
    return results;
  }
}
