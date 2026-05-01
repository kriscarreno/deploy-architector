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
import { NotFoundError, ForbiddenError } from "../utils/errors.js";

export class ProjectService {
  /**
   * @param {import('../repositories/ProjectRepository.js').ProjectRepository} projectRepo
   * @param {import('../repositories/RepoRepository.js').RepoRepository} repoRepo
   */
  constructor(projectRepo, repoRepo) {
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
}
