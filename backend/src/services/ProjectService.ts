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
}
