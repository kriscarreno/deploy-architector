/**
 * src/repositories/RepoEnvFileRepository.ts
 *
 * Data-access layer for the `repo_env_files` table.
 * Each row stores a plain-text file (e.g. appsettings.json, .env) that
 * the deploy worker writes to the local repo clone before pushing.
 */
import db from "../config/db.js";
import type { RepoEnvFile } from "../types.js";

export class RepoEnvFileRepository {
  findAllByRepo(repoId: number): RepoEnvFile[] {
    return db
      .prepare(
        "SELECT * FROM repo_env_files WHERE repo_id = ? ORDER BY branch ASC, filename ASC",
      )
      .all(repoId) as unknown as RepoEnvFile[];
  }

  findAllByRepoAndBranch(repoId: number, branch: string): RepoEnvFile[] {
    return db
      .prepare(
        "SELECT * FROM repo_env_files WHERE repo_id = ? AND branch = ? ORDER BY filename ASC",
      )
      .all(repoId, branch) as unknown as RepoEnvFile[];
  }

  findById(id: number): RepoEnvFile | null {
    return (
      (db
        .prepare("SELECT * FROM repo_env_files WHERE id = ?")
        .get(id) as unknown as RepoEnvFile | undefined) ?? null
    );
  }

  create(
    repoId: number,
    branch: string,
    filename: string,
    content: string,
  ): RepoEnvFile | null {
    const result = db
      .prepare(
        `INSERT INTO repo_env_files (repo_id, branch, filename, content)
         VALUES (?, ?, ?, ?)`,
      )
      .run(repoId, branch, filename, content);
    return this.findById(Number(result.lastInsertRowid));
  }

  update(id: number, filename: string, content: string): RepoEnvFile | null {
    db.prepare(
      `UPDATE repo_env_files
          SET filename   = ?,
              content    = ?,
              updated_at = datetime('now')
        WHERE id = ?`,
    ).run(filename, content, id);
    return this.findById(id);
  }

  delete(id: number): void {
    db.prepare("DELETE FROM repo_env_files WHERE id = ?").run(id);
  }
}
