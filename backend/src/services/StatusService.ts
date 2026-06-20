/**
 * src/services/StatusService.js
 *
 * Business logic for per-project healthchecks and the public status page.
 * Authenticated CRUD enforces project membership; the public aggregate is
 * exposed without auth but only includes projects flagged `status_public`
 * and never leaks the raw endpoint URLs.
 */
import type { ProjectRepository } from "../repositories/ProjectRepository.js";
import type { ProjectHealthcheckRepository } from "../repositories/ProjectHealthcheckRepository.js";
import type { Project, ProjectHealthcheck } from "../types.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";

export class StatusService {
  private projectRepo: ProjectRepository;
  private hcRepo: ProjectHealthcheckRepository;

  constructor(
    projectRepo: ProjectRepository,
    hcRepo: ProjectHealthcheckRepository,
  ) {
    this.projectRepo = projectRepo;
    this.hcRepo = hcRepo;
  }

  private async assertAccess(
    projectId: number,
    userId: number,
  ): Promise<Project> {
    const project = await this.projectRepo.findById(projectId);
    if (!project) throw new NotFoundError("Project not found");
    if (!(await this.projectRepo.isMember(projectId, userId)))
      throw new ForbiddenError();
    return project;
  }

  async listHealthchecks(
    projectId: number,
    userId: number,
  ): Promise<ProjectHealthcheck[]> {
    await this.assertAccess(projectId, userId);
    return this.hcRepo.findAllByProject(projectId);
  }

  async addHealthcheck(
    projectId: number,
    userId: number,
    data: { name: string; url: string; orderIndex?: number },
  ): Promise<ProjectHealthcheck | null> {
    await this.assertAccess(projectId, userId);
    return this.hcRepo.create({ projectId, ...data });
  }

  async updateHealthcheck(
    projectId: number,
    hcId: number,
    userId: number,
    data: { name?: string; url?: string; orderIndex?: number },
  ): Promise<ProjectHealthcheck | null> {
    await this.assertAccess(projectId, userId);
    const hc = await this.hcRepo.findById(hcId);
    if (!hc || hc.project_id !== projectId)
      throw new NotFoundError("Healthcheck not found");
    return this.hcRepo.update(hcId, data);
  }

  async deleteHealthcheck(
    projectId: number,
    hcId: number,
    userId: number,
  ): Promise<void> {
    await this.assertAccess(projectId, userId);
    const hc = await this.hcRepo.findById(hcId);
    if (!hc || hc.project_id !== projectId)
      throw new NotFoundError("Healthcheck not found");
    return this.hcRepo.delete(hcId);
  }

  async getStatusConfig(
    projectId: number,
    userId: number,
  ): Promise<{ status_base_url: string | null; status_public: number }> {
    const project = await this.assertAccess(projectId, userId);
    return {
      status_base_url: project.status_base_url,
      status_public: project.status_public,
    };
  }

  async setStatusConfig(
    projectId: number,
    userId: number,
    data: { statusBaseUrl?: string | null; statusPublic?: boolean },
  ): Promise<Project | null> {
    await this.assertAccess(projectId, userId);
    return this.projectRepo.updateStatusConfig(projectId, data);
  }

  /**
   * Public, unauthenticated aggregate. Groups checks by project, only for
   * projects flagged public, exposing names/status but NOT the raw URLs.
   */
  async getPublicStatus(): Promise<
    {
      projectId: number;
      projectName: string;
      checks: {
        name: string;
        status: string;
        statusCode: number | null;
        latencyMs: number | null;
        lastCheckedAt: string | null;
      }[];
    }[]
  > {
    const rows = await this.hcRepo.findAllWithProject();
    const byProject = new Map<
      number,
      {
        projectId: number;
        projectName: string;
        checks: {
          name: string;
          status: string;
          statusCode: number | null;
          latencyMs: number | null;
          lastCheckedAt: string | null;
        }[];
      }
    >();

    for (const r of rows) {
      if (!r.status_public) continue;
      let entry = byProject.get(r.project_id);
      if (!entry) {
        entry = {
          projectId: r.project_id,
          projectName: r.project_name,
          checks: [],
        };
        byProject.set(r.project_id, entry);
      }
      entry.checks.push({
        name: r.name,
        status: r.status,
        statusCode: r.status_code,
        latencyMs: r.latency_ms,
        lastCheckedAt: r.last_checked_at,
      });
    }

    return Array.from(byProject.values()).sort((a, b) =>
      a.projectName.localeCompare(b.projectName),
    );
  }
}
