/**
 * src/repositories/EnvVarRepository.ts
 *
 * Data-access layer for the `repo_env_vars` table.
 */
import db from "../config/db.js";
import type { EnvVar, EnvBranch } from "../types.js";

type UpsertPayload = {
  repoId: number;
  branch: EnvBranch;
  key: string;
  value: string;
  isSecret?: boolean;
};

type UpdatePayload = {
  value?: string;
  isSecret?: boolean;
};

export class EnvVarRepository {
  findByRepo(repoId: number, branch?: EnvBranch): EnvVar[] {
    if (branch) {
      return db
        .prepare(
          "SELECT * FROM repo_env_vars WHERE repo_id = ? AND branch = ? ORDER BY key ASC",
        )
        .all(repoId, branch) as unknown as EnvVar[];
    }
    return db
      .prepare(
        "SELECT * FROM repo_env_vars WHERE repo_id = ? ORDER BY branch ASC, key ASC",
      )
      .all(repoId) as unknown as EnvVar[];
  }

  findById(id: number): EnvVar | null {
    return (
      (db
        .prepare("SELECT * FROM repo_env_vars WHERE id = ?")
        .get(id) as unknown as EnvVar | undefined) ?? null
    );
  }

  /**
   * INSERT OR REPLACE — if (repo_id, branch, key) already exists the row is
   * replaced (id changes), matching SQLite's UNIQUE constraint.
   */
  upsert({
    repoId,
    branch,
    key,
    value,
    isSecret = false,
  }: UpsertPayload): EnvVar | null {
    const result = db
      .prepare(
        `INSERT INTO repo_env_vars (repo_id, branch, key, value, is_secret)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(repo_id, branch, key) DO UPDATE SET
           value      = excluded.value,
           is_secret  = excluded.is_secret,
           updated_at = datetime('now')`,
      )
      .run(repoId, branch, key, value, isSecret ? 1 : 0);

    // After upsert the rowid may differ from lastInsertRowid on conflict-update;
    // fetch by unique constraint instead.
    return (
      (db
        .prepare(
          "SELECT * FROM repo_env_vars WHERE repo_id = ? AND branch = ? AND key = ?",
        )
        .get(repoId, branch, key) as unknown as EnvVar | undefined) ?? null
    );
  }

  update(id: number, { value, isSecret }: UpdatePayload): EnvVar | null {
    db.prepare(
      `UPDATE repo_env_vars
          SET value      = COALESCE(?, value),
              is_secret  = COALESCE(?, is_secret),
              updated_at = datetime('now')
        WHERE id = ?`,
    ).run(
      value ?? null,
      isSecret !== undefined ? (isSecret ? 1 : 0) : null,
      id,
    );

    return this.findById(id);
  }

  delete(id: number): boolean {
    const result = db.prepare("DELETE FROM repo_env_vars WHERE id = ?").run(id);
    return result.changes > 0;
  }

  deleteByRepo(repoId: number, branch?: EnvBranch): void {
    if (branch) {
      db.prepare(
        "DELETE FROM repo_env_vars WHERE repo_id = ? AND branch = ?",
      ).run(repoId, branch);
    } else {
      db.prepare("DELETE FROM repo_env_vars WHERE repo_id = ?").run(repoId);
    }
  }

  /**
   * Upserts multiple variables in a single transaction.
   * Returns the count of rows affected.
   */
  bulkUpsert(items: UpsertPayload[]): number {
    const stmt = db.prepare(
      `INSERT INTO repo_env_vars (repo_id, branch, key, value, is_secret)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(repo_id, branch, key) DO UPDATE SET
         value      = excluded.value,
         is_secret  = excluded.is_secret,
         updated_at = datetime('now')`,
    );

    db.exec("BEGIN");
    try {
      for (const { repoId, branch, key, value, isSecret = false } of items) {
        stmt.run(repoId, branch, key, value, isSecret ? 1 : 0);
      }
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }

    return items.length;
  }
}
