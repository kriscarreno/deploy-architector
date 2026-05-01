/**
 * src/repositories/ProjectRepository.js
 *
 * Data-access layer for `projects` and `project_members` tables.
 */
import db from "../config/db.js";
import type { Project } from "../types.js";

type CreatePayload = {
  ownerId: number;
  name: string;
  description?: string | null;
  atomic?: boolean;
};

type UpdatePayload = {
  name?: string;
  description?: string | null;
  atomic?: boolean;
};

export class ProjectRepository {
  async findAllByUser(userId: number): Promise<Project[]> {
    return db
      .prepare(
        `SELECT DISTINCT p.*,
                (SELECT COUNT(*) FROM repos WHERE project_id = p.id) AS repo_count
           FROM projects p
           LEFT JOIN project_members pm ON pm.project_id = p.id
          WHERE p.owner_id = ? OR pm.user_id = ?
          ORDER BY p.created_at DESC`,
      )
      .all(userId, userId) as unknown as Project[];
  }

  async findById(projectId: number): Promise<Project | null> {
    return (
      (db
        .prepare("SELECT * FROM projects WHERE id = ?")
        .get(projectId) as unknown as Project | undefined) ?? null
    );
  }

  async create({
    ownerId,
    name,
    description,
    atomic = false,
  }: CreatePayload): Promise<Project | null> {
    const result = db
      .prepare(
        `INSERT INTO projects (owner_id, name, description, atomic)
         VALUES (?, ?, ?, ?)`,
      )
      .run(ownerId, name, description ?? null, atomic ? 1 : 0);

    return this.findById(Number(result.lastInsertRowid));
  }

  async update(
    projectId: number,
    { name, description, atomic }: UpdatePayload,
  ): Promise<Project | null> {
    db.prepare(
      `UPDATE projects
          SET name = COALESCE(?, name),
              description = COALESCE(?, description),
              atomic = COALESCE(?, atomic),
              updated_at = datetime('now')
        WHERE id = ?`,
    ).run(
      name ?? null,
      description ?? null,
      atomic != null ? (atomic ? 1 : 0) : null,
      projectId,
    );

    return this.findById(projectId);
  }

  async delete(projectId: number): Promise<void> {
    db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
  }

  // ── RBAC helpers ──────────────────────────────────────────────────────────

  async isMember(projectId: number, userId: number): Promise<boolean> {
    const row = db
      .prepare(
        `SELECT 1
           FROM projects p
           LEFT JOIN project_members pm ON pm.project_id = p.id
          WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id = ?)
          LIMIT 1`,
      )
      .get(projectId, userId, userId);

    return !!row;
  }

  async isOwner(projectId: number, userId: number): Promise<boolean> {
    const row = db
      .prepare("SELECT 1 FROM projects WHERE id = ? AND owner_id = ?")
      .get(projectId, userId);

    return !!row;
  }

  async addMember(
    projectId: number,
    userId: number,
    role = "member",
  ): Promise<void> {
    db.prepare(
      `INSERT OR IGNORE INTO project_members (project_id, user_id, role)
       VALUES (?, ?, ?)`,
    ).run(projectId, userId, role);
  }

  async listMembers(projectId: number): Promise<unknown[]> {
    return db
      .prepare(
        `SELECT u.id, u.username, u.avatar_url, pm.role
           FROM project_members pm
           JOIN users u ON u.id = pm.user_id
          WHERE pm.project_id = ?`,
      )
      .all(projectId);
  }
}
