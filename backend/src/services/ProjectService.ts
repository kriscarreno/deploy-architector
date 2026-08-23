/**
 * src/services/ProjectService.js
 *
 * Business-logic layer for projects and repos.
 * Orchestrates repository calls, enforces RBAC, and throws
 * domain-specific errors (NotFoundError, ForbiddenError, etc.)
 * that the controller translates to HTTP responses.
 *
 * Dependencies are injected via constructor — makes unit testing easy.
 */
import type { ProjectRepository } from "../repositories/ProjectRepository.js";
import type { RepoRepository } from "../repositories/RepoRepository.js";
import type { RepoEnvFileRepository } from "../repositories/RepoEnvFileRepository.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";
import { cloneOrFetch, getDiffSummary } from "../utils/gitHelper.js";
import { compareBranches } from "../utils/githubApi.js";
import { getCached, setCached } from "../utils/syncCache.js";
import { scheduler } from "../config/scheduler.js";

/** Per-project roll-up of how far `main` is ahead of `production`. */
export interface ProjectSyncSummary {
  projectId: number;
  repoCount: number;
  /** Repos with at least one commit waiting to be merged into production. */
  pendingRepos: number;
  /** Total commits across those repos. */
  aheadCommits: number;
  /** Repos whose comparison could not be resolved (missing branch, no access…). */
  unknownRepos: number;
}

export class ProjectService {
  private projectRepo: ProjectRepository;
  private repoRepo: RepoRepository;
  private repoEnvFileRepo: RepoEnvFileRepository;

  constructor(
    projectRepo: ProjectRepository,
    repoRepo: RepoRepository,
    repoEnvFileRepo: RepoEnvFileRepository,
  ) {
    this.projectRepo = projectRepo;
    this.repoRepo = repoRepo;
    this.repoEnvFileRepo = repoEnvFileRepo;
  }

  // ── Projects ─────────────────────────────────────────────────────────────

  async listProjects(userId) {
    return this.projectRepo.findAllByUser(userId);
  }

  async createProject(userId, data) {
    return this.projectRepo.create({ ownerId: userId, ...data });
  }

  async getProject(projectId, userId) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");

    const member = await this.projectRepo.isMember(projectId, userId);
    if (!member) throw new ForbiddenError();

    return project;
  }

  // ── Repos ─────────────────────────────────────────────────────────────────

  async listRepos(projectId, userId) {
    await this.getProject(projectId, userId); // ensures access
    return this.repoRepo.findAllByProject(projectId);
  }

  async addRepo(projectId, userId, data) {
    await this.getProject(projectId, userId); // ensures access

    // Auto-assign next available order index to prevent duplicates
    const nextOrder = this.repoRepo.nextOrderIndex(projectId);
    const orderIndex =
      data.orderIndex == null || data.orderIndex === 0
        ? nextOrder
        : data.orderIndex;

    return this.repoRepo.create({ projectId, ...data, orderIndex });
  }

  async getProjectWithRepos(projectId, userId) {
    const project = await this.getProject(projectId, userId);
    const repos = await this.repoRepo.findAllByProject(projectId);
    return { ...project, repos };
  }

  async updateProject(projectId, userId, data) {
    await this.getProject(projectId, userId); // ensures access + existence
    return this.projectRepo.update(projectId, data);
  }

  async deleteProject(projectId, userId) {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");
    if (project.owner_id !== userId)
      throw new ForbiddenError("Only the owner can delete a project");
    return this.projectRepo.delete(projectId);
  }

  async deleteRepo(projectId, repoId, userId) {
    await this.getProject(projectId, userId); // ensures access
    const repo = await this.repoRepo.findById(repoId);
    if (!repo || repo.project_id !== projectId)
      throw new NotFoundError("Repo not found");
    return this.repoRepo.delete(repoId);
  }

  async updateRepo(projectId, repoId, userId, data) {
    await this.getProject(projectId, userId); // ensures access
    const repo = await this.repoRepo.findById(repoId);
    if (!repo || repo.project_id !== projectId)
      throw new NotFoundError("Repo not found");
    return this.repoRepo.update(repoId, data);
  }

  async getRepoDiffs(projectId: number, userId: number, accessToken: string) {
    await this.getProject(projectId, userId); // ensures access
    const repos = await this.repoRepo.findAllByProject(projectId);

    const results = await Promise.all(
      repos.map(async (repo) => {
        try {
          const git = await cloneOrFetch(repo, accessToken);
          const diff = await getDiffSummary(
            git,
            repo.main_branch,
            repo.prod_branch,
          );
          const upToDate = diff.includes("identical");
          return { repoId: repo.id, name: repo.name, diff, upToDate };
        } catch (err: any) {
          return {
            repoId: repo.id,
            name: repo.name,
            diff: `Error al obtener diff: ${err.message}`,
            upToDate: false,
          };
        }
      }),
    );

    return results;
  }

  /**
   * Cheap "is there anything to deploy?" roll-up for every project the user
   * can see. Uses the GitHub compare API instead of cloning, so it's fast
   * enough for the projects list; results are cached per user for a minute.
   */
  async getSyncSummary(
    userId: number,
    accessToken: string,
  ): Promise<ProjectSyncSummary[]> {
    const cached = getCached<ProjectSyncSummary[]>(userId);
    if (cached) return cached;

    const projects = await this.projectRepo.findAllByUser(userId);

    const summaries = await Promise.all(
      projects.map(async (project) => {
        const repos = await this.repoRepo.findAllByProject(project.id);

        const comparisons = await Promise.all(
          repos.map((repo) =>
            compareBranches(
              repo.github_url,
              repo.prod_branch,
              repo.main_branch,
              accessToken,
            ),
          ),
        );

        let pendingRepos = 0;
        let aheadCommits = 0;
        let unknownRepos = 0;

        for (const comparison of comparisons) {
          if (!comparison) {
            unknownRepos++;
          } else if (comparison.aheadBy > 0) {
            pendingRepos++;
            aheadCommits += comparison.aheadBy;
          }
        }

        return {
          projectId: project.id,
          repoCount: repos.length,
          pendingRepos,
          aheadCommits,
          unknownRepos,
        };
      }),
    );

    setCached(userId, summaries);
    return summaries;
  }

  async updateCronConfig(
    projectId: number,
    userId: number,
    {
      cronExpression,
      cronEnabled,
    }: { cronExpression: string | null; cronEnabled: boolean },
  ) {
    const project = await this.getProject(projectId, userId);
    if (project.owner_id !== userId)
      throw new ForbiddenError("Only the owner can configure the schedule");

    const updated = await this.projectRepo.updateCron(projectId, {
      cronExpression,
      cronEnabled,
    });
    if (updated) scheduler.upsertJob(updated);
    return updated;
  }

  // ── Env files ─────────────────────────────────────────────────────────────

  private async getRepoInProject(projectId, repoId, userId) {
    await this.getProject(projectId, userId);
    const repo = await this.repoRepo.findById(repoId);
    if (!repo || repo.project_id !== projectId)
      throw new NotFoundError("Repo not found");
    return repo;
  }

  async listEnvFiles(projectId, repoId, userId) {
    await this.getRepoInProject(projectId, repoId, userId);
    return this.repoEnvFileRepo.findAllByRepo(repoId);
  }

  async createEnvFile(projectId, repoId, userId, branch, filename, content) {
    await this.getRepoInProject(projectId, repoId, userId);
    return this.repoEnvFileRepo.create(repoId, branch, filename, content);
  }

  async updateEnvFile(projectId, repoId, envFileId, userId, filename, content) {
    await this.getRepoInProject(projectId, repoId, userId);
    const envFile = this.repoEnvFileRepo.findById(envFileId);
    if (!envFile || envFile.repo_id !== repoId)
      throw new NotFoundError("Env file not found");
    return this.repoEnvFileRepo.update(envFileId, filename, content);
  }

  async deleteEnvFile(projectId, repoId, envFileId, userId) {
    await this.getRepoInProject(projectId, repoId, userId);
    const envFile = this.repoEnvFileRepo.findById(envFileId);
    if (!envFile || envFile.repo_id !== repoId)
      throw new NotFoundError("Env file not found");
    return this.repoEnvFileRepo.delete(envFileId);
  }

  async getEnvFile(projectId, repoId, envFileId, userId) {
    await this.getRepoInProject(projectId, repoId, userId);
    const envFile = this.repoEnvFileRepo.findById(envFileId);
    if (!envFile || envFile.repo_id !== repoId)
      throw new NotFoundError("Env file not found");
    return envFile;
  }
}
