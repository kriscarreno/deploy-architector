/**
 * src/repositories/TeamRepository.js
 *
 * Data-access layer for the `teams` and `team_members` tables.
 */
import db from "../config/db.js";
import type { Team, TeamMember, TeamRole } from "../types.js";

export class TeamRepository {
  async findAllByUser(userId: number): Promise<Team[]> {
    return db
      .prepare(
        `SELECT DISTINCT t.*
           FROM teams t
           LEFT JOIN team_members tm ON tm.team_id = t.id
          WHERE t.owner_id = ? OR tm.user_id = ?
          ORDER BY t.created_at DESC`,
      )
      .all(userId, userId) as unknown as Team[];
  }

  async findById(teamId: number): Promise<Team | null> {
    return (
      (db.prepare("SELECT * FROM teams WHERE id = ?").get(teamId) as unknown as
        | Team
        | undefined) ?? null
    );
  }

  async create(ownerId: number, name: string): Promise<Team | null> {
    const result = db
      .prepare("INSERT INTO teams (owner_id, name) VALUES (?, ?)")
      .run(ownerId, name);

    const teamId = Number(result.lastInsertRowid);
    // The owner is also a member (role 'owner') so member queries are uniform
    db.prepare(
      `INSERT OR IGNORE INTO team_members (team_id, user_id, role)
       VALUES (?, ?, 'owner')`,
    ).run(teamId, ownerId);

    return this.findById(teamId);
  }

  async update(teamId: number, name: string): Promise<Team | null> {
    db.prepare(
      `UPDATE teams SET name = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(name, teamId);
    return this.findById(teamId);
  }

  async delete(teamId: number): Promise<void> {
    db.prepare("DELETE FROM teams WHERE id = ?").run(teamId);
  }

  // ── Membership ──────────────────────────────────────────────────────────

  async isMember(teamId: number, userId: number): Promise<boolean> {
    const row = db
      .prepare(
        `SELECT 1
           FROM teams t
           LEFT JOIN team_members tm ON tm.team_id = t.id
          WHERE t.id = ? AND (t.owner_id = ? OR tm.user_id = ?)
          LIMIT 1`,
      )
      .get(teamId, userId, userId);
    return !!row;
  }

  /** Owner or admin — allowed to manage members and team settings. */
  async isAdmin(teamId: number, userId: number): Promise<boolean> {
    const row = db
      .prepare(
        `SELECT 1
           FROM teams t
           LEFT JOIN team_members tm
                  ON tm.team_id = t.id AND tm.user_id = ?
          WHERE t.id = ?
            AND (t.owner_id = ? OR tm.role IN ('owner', 'admin'))
          LIMIT 1`,
      )
      .get(userId, teamId, userId);
    return !!row;
  }

  /** Owner — allowed to manage roles (designate/remove owners). */
  async isOwner(teamId: number, userId: number): Promise<boolean> {
    const row = db
      .prepare(
        `SELECT 1
           FROM teams t
           LEFT JOIN team_members tm
                  ON tm.team_id = t.id AND tm.user_id = ?
          WHERE t.id = ?
            AND (t.owner_id = ? OR tm.role = 'owner')
          LIMIT 1`,
      )
      .get(userId, teamId, userId);
    return !!row;
  }

  async countOwners(teamId: number): Promise<number> {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS n
           FROM team_members
          WHERE team_id = ? AND role = 'owner'`,
      )
      .get(teamId) as unknown as { n: number };
    return row?.n ?? 0;
  }

  async updateMemberRole(
    teamId: number,
    userId: number,
    role: TeamRole,
  ): Promise<void> {
    db.prepare(
      `UPDATE team_members SET role = ? WHERE team_id = ? AND user_id = ?`,
    ).run(role, teamId, userId);
  }

  async addMember(
    teamId: number,
    userId: number,
    role: TeamRole = "member",
  ): Promise<void> {
    db.prepare(
      `INSERT INTO team_members (team_id, user_id, role)
       VALUES (?, ?, ?)
       ON CONFLICT(team_id, user_id) DO UPDATE SET role = excluded.role`,
    ).run(teamId, userId, role);
  }

  async removeMember(teamId: number, userId: number): Promise<void> {
    db.prepare(
      "DELETE FROM team_members WHERE team_id = ? AND user_id = ?",
    ).run(teamId, userId);
  }

  async listMembers(teamId: number): Promise<TeamMember[]> {
    return db
      .prepare(
        `SELECT u.id, u.username, u.avatar_url, tm.role
           FROM team_members tm
           JOIN users u ON u.id = tm.user_id
          WHERE tm.team_id = ?
          ORDER BY tm.created_at ASC`,
      )
      .all(teamId) as unknown as TeamMember[];
  }
}
