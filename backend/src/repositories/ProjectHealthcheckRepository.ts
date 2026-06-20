/**
 * src/repositories/ProjectHealthcheckRepository.js
 *
 * Data-access layer for `project_healthchecks` — the per-project list of
 * named status endpoints shown on the status page.
 */
import db from "../config/db.js";
import type { HealthStatus, ProjectHealthcheck } from "../types.js";

type CreatePayload = {
  projectId: number;
  name: string;
  url: string;
  orderIndex?: number;
};

type UpdatePayload = {
  name?: string;
  url?: string;
  orderIndex?: number;
};

/** A healthcheck row joined with its project's base URL + name (for pinging). */
export interface HealthcheckWithProject extends ProjectHealthcheck {
  status_base_url: string | null;
  project_name: string;
  status_public: number;
}

export class ProjectHealthcheckRepository {
  async findAllByProject(projectId: number): Promise<ProjectHealthcheck[]> {
    return db
      .prepare(
        `SELECT * FROM project_healthchecks
          WHERE project_id = ?
          ORDER BY order_index ASC, id ASC`,
      )
      .all(projectId) as unknown as ProjectHealthcheck[];
  }

  async findById(id: number): Promise<ProjectHealthcheck | null> {
    return (
      (db
        .prepare("SELECT * FROM project_healthchecks WHERE id = ?")
        .get(id) as unknown as ProjectHealthcheck | undefined) ?? null
    );
  }

  async create({
    projectId,
    name,
    url,
    orderIndex = 0,
  }: CreatePayload): Promise<ProjectHealthcheck | null> {
    const result = db
      .prepare(
        `INSERT INTO project_healthchecks (project_id, name, url, order_index)
         VALUES (?, ?, ?, ?)`,
      )
      .run(projectId, name, url, orderIndex);
    return this.findById(Number(result.lastInsertRowid));
  }

  async update(
    id: number,
    { name, url, orderIndex }: UpdatePayload,
  ): Promise<ProjectHealthcheck | null> {
    db.prepare(
      `UPDATE project_healthchecks
          SET name = COALESCE(?, name),
              url = COALESCE(?, url),
              order_index = COALESCE(?, order_index),
              updated_at = datetime('now')
        WHERE id = ?`,
    ).run(name ?? null, url ?? null, orderIndex ?? null, id);
    return this.findById(id);
  }

  async delete(id: number): Promise<void> {
    db.prepare("DELETE FROM project_healthchecks WHERE id = ?").run(id);
  }

  async updateStatus(
    id: number,
    status: HealthStatus,
    statusCode: number | null,
    latencyMs: number | null,
  ): Promise<void> {
    db.prepare(
      `UPDATE project_healthchecks
          SET status = ?, status_code = ?, latency_ms = ?,
              last_checked_at = datetime('now')
        WHERE id = ?`,
    ).run(status, statusCode, latencyMs, id);
  }

  /** All healthchecks across all projects, joined with project base URL. */
  async findAllWithProject(): Promise<HealthcheckWithProject[]> {
    return db
      .prepare(
        `SELECT hc.*, p.status_base_url, p.name AS project_name, p.status_public
           FROM project_healthchecks hc
           JOIN projects p ON p.id = hc.project_id`,
      )
      .all() as unknown as HealthcheckWithProject[];
  }
}
