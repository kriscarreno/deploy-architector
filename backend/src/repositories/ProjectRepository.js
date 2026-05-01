/**
 * src/repositories/ProjectRepository.js
 *
 * Data-access layer for `projects` and `project_members` tables.
 */
import db from "../config/db.js";

export class ProjectRepository {
  async findAllByUser(userId) {
    // Returns projects owned by OR where the user is a member
    return db
      .prepare(
        `SELECT DISTINCT p.*
           FROM projects p
           LEFT JOIN project_members pm ON pm.project_id = p.id
          WHERE p.owner_id = ? OR pm.user_id = ?
          ORDER BY p.created_at DESC`,
      )
      .all(userId, userId);
  }

  async findById(projectId) {
    return (
      db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId) ?? null
    );
  }

  async create({ ownerId, name, description, atomic = false }) {
    const result = db
      .prepare(
        `INSERT INTO projects (owner_id, name, description, atomic)
         VALUES (?, ?, ?, ?)`,
      )
      .run(ownerId, name, description ?? null, atomic ? 1 : 0);

    return this.findById(result.lastInsertRowid);
  }

  async update(projectId, { name, description, atomic }) {
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

  async delete(projectId) {
    db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
  }

  // ── RBAC helpers ──────────────────────────────────────────────────────────

  /**
   * Returns true if userId is the project owner OR a member.
   */
  async isMember(projectId, userId) {
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

  async isOwner(projectId, userId) {
    const row = db
      .prepare("SELECT 1 FROM projects WHERE id = ? AND owner_id = ?")
      .get(projectId, userId);

    return !!row;
  }

  async addMember(projectId, userId, role = "member") {
    db.prepare(
      `INSERT OR IGNORE INTO project_members (project_id, user_id, role)
       VALUES (?, ?, ?)`,
    ).run(projectId, userId, role);
  }

  async listMembers(projectId) {
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
