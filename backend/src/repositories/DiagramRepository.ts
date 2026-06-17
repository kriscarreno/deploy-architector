/**
 * src/repositories/DiagramRepository.js
 *
 * Data-access layer for the `diagrams` table.
 * Access to a diagram = its owner OR any member of its team.
 */
import db from "../config/db.js";
import type { Diagram } from "../types.js";

type CreatePayload = {
  ownerId: number;
  name: string;
  description?: string | null;
  teamId?: number | null;
};

type UpdatePayload = {
  name?: string;
  description?: string | null;
  teamId?: number | null;
};

export class DiagramRepository {
  async findAllByUser(userId: number): Promise<Diagram[]> {
    return db
      .prepare(
        `SELECT DISTINCT d.*
           FROM diagrams d
           LEFT JOIN team_members tm ON tm.team_id = d.team_id
          WHERE d.owner_id = ? OR tm.user_id = ?
          ORDER BY d.updated_at DESC`,
      )
      .all(userId, userId) as unknown as Diagram[];
  }

  async findById(diagramId: number): Promise<Diagram | null> {
    return (
      (db
        .prepare("SELECT * FROM diagrams WHERE id = ?")
        .get(diagramId) as unknown as Diagram | undefined) ?? null
    );
  }

  async create({
    ownerId,
    name,
    description,
    teamId,
  }: CreatePayload): Promise<Diagram | null> {
    const result = db
      .prepare(
        `INSERT INTO diagrams (owner_id, name, description, team_id)
         VALUES (?, ?, ?, ?)`,
      )
      .run(ownerId, name, description ?? null, teamId ?? null);
    return this.findById(Number(result.lastInsertRowid));
  }

  async update(
    diagramId: number,
    { name, description, teamId }: UpdatePayload,
  ): Promise<Diagram | null> {
    db.prepare(
      `UPDATE diagrams
          SET name = COALESCE(?, name),
              description = COALESCE(?, description),
              team_id = ?,
              updated_at = datetime('now')
        WHERE id = ?`,
    ).run(
      name ?? null,
      description ?? null,
      // teamId is explicitly settable to null (un-share), so pass through as-is
      teamId === undefined ? null : teamId,
      diagramId,
    );
    return this.findById(diagramId);
  }

  async touch(diagramId: number): Promise<void> {
    db.prepare(
      "UPDATE diagrams SET updated_at = datetime('now') WHERE id = ?",
    ).run(diagramId);
  }

  async delete(diagramId: number): Promise<void> {
    db.prepare("DELETE FROM diagrams WHERE id = ?").run(diagramId);
  }

  // ── Access control ────────────────────────────────────────────────────────

  async canAccess(diagramId: number, userId: number): Promise<boolean> {
    const row = db
      .prepare(
        `SELECT 1
           FROM diagrams d
           LEFT JOIN team_members tm ON tm.team_id = d.team_id
          WHERE d.id = ? AND (d.owner_id = ? OR tm.user_id = ?)
          LIMIT 1`,
      )
      .get(diagramId, userId, userId);
    return !!row;
  }

  async isOwner(diagramId: number, userId: number): Promise<boolean> {
    const row = db
      .prepare("SELECT 1 FROM diagrams WHERE id = ? AND owner_id = ?")
      .get(diagramId, userId);
    return !!row;
  }
}
