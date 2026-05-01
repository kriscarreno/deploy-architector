/**
 * src/repositories/RepoRepository.js
 *
 * Data-access layer for the `repos` table.
 */
import db from "../config/db.js";
import type { Repo } from "../types.js";

type CreatePayload = {
  projectId: number;
  githubUrl: string;
  name: string;
  orderIndex?: number;
  prodBranch?: string;
  mainBranch?: string;
};

type UpdatePayload = {
  githubUrl?: string;
  name?: string;
  mainBranch?: string;
  prodBranch?: string;
  orderIndex?: number;
};

export class RepoRepository {
  async findAllByProject(projectId: number): Promise<Repo[]> {
    return db
      .prepare(
        "SELECT * FROM repos WHERE project_id = ? ORDER BY order_index ASC",
      )
      .all(projectId) as unknown as Repo[];
  }

  async findById(repoId: number): Promise<Repo | null> {
    return (
      (db.prepare("SELECT * FROM repos WHERE id = ?").get(repoId) as unknown as
        | Repo
        | undefined) ?? null
    );
  }

  async create({
    projectId,
    githubUrl,
    name,
    orderIndex = 0,
    prodBranch = "production",
    mainBranch = "main",
  }: CreatePayload): Promise<Repo | null> {
    const result = db
      .prepare(
        `INSERT INTO repos (project_id, github_url, name, order_index, prod_branch, main_branch)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(projectId, githubUrl, name, orderIndex, prodBranch, mainBranch);

    return this.findById(Number(result.lastInsertRowid));
  }

  async update(
    repoId: number,
    { githubUrl, name, mainBranch, prodBranch, orderIndex }: UpdatePayload,
  ): Promise<Repo | null> {
    db.prepare(
      `UPDATE repos
          SET github_url   = COALESCE(?, github_url),
              name         = COALESCE(?, name),
              main_branch  = COALESCE(?, main_branch),
              prod_branch  = COALESCE(?, prod_branch),
              order_index  = COALESCE(?, order_index)
        WHERE id = ?`,
    ).run(
      githubUrl ?? null,
      name ?? null,
      mainBranch ?? null,
      prodBranch ?? null,
      orderIndex ?? null,
      repoId,
    );
    return this.findById(repoId);
  }

  async updateLocalPath(repoId: number, localPath: string): Promise<void> {
    db.prepare("UPDATE repos SET local_path = ? WHERE id = ?").run(
      localPath,
      repoId,
    );
  }

  async delete(repoId: number): Promise<void> {
    db.prepare("DELETE FROM repos WHERE id = ?").run(repoId);
  }
}
