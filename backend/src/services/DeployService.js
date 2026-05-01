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
import { v4 as uuidv4 } from "uuid";
// uuid v14 exports v4 directly — works with both v9 and v14
import { NotFoundError, ForbiddenError } from "../utils/errors.js";
import logger from "../config/logger.js";

export class DeployService {
  /**
   * @param {import('../repositories/ProjectRepository.js').ProjectRepository} projectRepo
   * @param {import('../repositories/DeployLogRepository.js').DeployLogRepository} deployLogRepo
   * @param {import('../queues/deployQueue.js').deployQueue} deployQueue
   */
  constructor(projectRepo, deployLogRepo, deployQueue) {
    this.projectRepo = projectRepo;
    this.deployLogRepo = deployLogRepo;
    this.deployQueue = deployQueue;
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
}
