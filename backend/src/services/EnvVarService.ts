/**
 * src/services/EnvVarService.ts
 *
 * Business-logic layer for repo environment variables.
 * Validates branch values against the repo's configured branches
 * and enforces project membership before any operation.
 */
import type { EnvVarRepository } from "../repositories/EnvVarRepository.js";
import type { RepoRepository } from "../repositories/RepoRepository.js";
import type { ProjectRepository } from "../repositories/ProjectRepository.js";
import type { EnvBranch } from "../types.js";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../utils/errors.js";

export class EnvVarService {
  constructor(
    private envVarRepo: EnvVarRepository,
    private repoRepo: RepoRepository,
    private projectRepo: ProjectRepository,
  ) {}

  private async assertAccess(repoId: number, userId: number) {
    const repo = await this.repoRepo.findById(repoId);
    if (!repo) throw new NotFoundError("Repo not found");

    const member = await this.projectRepo.isMember(repo.project_id, userId);
    if (!member) throw new ForbiddenError();

    return repo;
  }

  private validateBranch(
    branch: string,
    repo: { main_branch: string; prod_branch: string },
  ): EnvBranch {
    const allowed: EnvBranch[] = ["main", "production"];
    if (!allowed.includes(branch as EnvBranch)) {
      throw new ValidationError(`branch must be one of: ${allowed.join(", ")}`);
    }
    return branch as EnvBranch;
  }

  async list(repoId: number, userId: number, branch?: string) {
    const repo = await this.assertAccess(repoId, userId);
    const b = branch ? this.validateBranch(branch, repo) : undefined;
    return this.envVarRepo.findByRepo(repoId, b);
  }

  async upsert(
    repoId: number,
    userId: number,
    branch: string,
    key: string,
    value: string,
    isSecret: boolean,
  ) {
    const repo = await this.assertAccess(repoId, userId);
    const b = this.validateBranch(branch, repo);
    return this.envVarRepo.upsert({ repoId, branch: b, key, value, isSecret });
  }

  async update(
    repoId: number,
    envId: number,
    userId: number,
    data: { value?: string; isSecret?: boolean },
  ) {
    await this.assertAccess(repoId, userId);
    const existing = this.envVarRepo.findById(envId);
    if (!existing || existing.repo_id !== repoId)
      throw new NotFoundError("Env var not found");

    return this.envVarRepo.update(envId, data);
  }

  async remove(repoId: number, envId: number, userId: number) {
    await this.assertAccess(repoId, userId);
    const existing = this.envVarRepo.findById(envId);
    if (!existing || existing.repo_id !== repoId)
      throw new NotFoundError("Env var not found");

    return this.envVarRepo.delete(envId);
  }

  /**
   * Returns a .env formatted string for the given repo + branch.
   * Secrets are included in plain text (the file is meant for internal use).
   */
  async export(
    repoId: number,
    userId: number,
    branch: string,
  ): Promise<string> {
    const repo = await this.assertAccess(repoId, userId);
    const b = this.validateBranch(branch, repo);
    const vars = this.envVarRepo.findByRepo(repoId, b);

    const lines = vars.map((v) => {
      // Wrap value in double quotes and escape internal quotes
      const safeValue =
        v.value.includes(" ") || v.value.includes("#") || v.value.includes('"')
          ? `"${v.value.replace(/"/g, '\\"')}"`
          : v.value;
      return `${v.key}=${safeValue}`;
    });

    return lines.join("\n");
  }

  /**
   * Bulk upsert from a parsed list of key/value pairs.
   * Existing keys for this repo+branch are overwritten; new ones are inserted.
   */
  async bulkUpsert(
    repoId: number,
    userId: number,
    branch: string,
    entries: Array<{ key: string; value: string; isSecret?: boolean }>,
  ): Promise<number> {
    const repo = await this.assertAccess(repoId, userId);
    const b = this.validateBranch(branch, repo);

    const items = entries.map(({ key, value, isSecret = false }) => ({
      repoId,
      branch: b,
      key,
      value,
      isSecret,
    }));

    return this.envVarRepo.bulkUpsert(items);
  }
}
