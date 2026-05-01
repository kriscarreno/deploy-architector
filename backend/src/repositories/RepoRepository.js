/**
 * src/repositories/RepoRepository.js
 *
 * Data-access layer for the `repos` table.
 */
import db from "../config/db.js";

export class RepoRepository {
  async findAllByProject(projectId) {
    return db
      .prepare(
        "SELECT * FROM repos WHERE project_id = ? ORDER BY order_index ASC",
      )
      .all(projectId);
  }

  async findById(repoId) {
    return db.prepare("SELECT * FROM repos WHERE id = ?").get(repoId) ?? null;
  }

  async create({
    projectId,
    githubUrl,
    name,
    orderIndex = 0,
    prodBranch = "production",
    mainBranch = "main",
  }) {
    const result = db
      .prepare(
        `INSERT INTO repos (project_id, github_url, name, order_index, prod_branch, main_branch)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(projectId, githubUrl, name, orderIndex, prodBranch, mainBranch);

    return this.findById(result.lastInsertRowid);
  }

  async update(
    repoId,
    { githubUrl, name, mainBranch, prodBranch, orderIndex },
  ) {
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

  async updateLocalPath(repoId, localPath) {
    db.prepare("UPDATE repos SET local_path = ? WHERE id = ?").run(
      localPath,
      repoId,
    );
  }

  async delete(repoId) {
    db.prepare("DELETE FROM repos WHERE id = ?").run(repoId);
  }
}
