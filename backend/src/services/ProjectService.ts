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
import { NotFoundError, ForbiddenError } from "../utils/errors.js";
import { cloneOrFetch, getDiffSummary } from "../utils/gitHelper.js";
import { scheduler } from "../config/scheduler.js";

export class ProjectService {
  private projectRepo: ProjectRepository;
  private repoRepo: RepoRepository;

  constructor(projectRepo: ProjectRepository, repoRepo: RepoRepository) {
    this.projectRepo = projectRepo;
    this.repoRepo = repoRepo;
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
    return this.repoRepo.create({ projectId, ...data });
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
}
