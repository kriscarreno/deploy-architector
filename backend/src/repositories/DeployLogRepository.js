/**
 * src/repositories/DeployLogRepository.js
 *
 * Data-access layer for `deploy_logs` table.
 */
import db from "../config/db.js";

export class DeployLogRepository {
  async create({ projectId, userId, jobId }) {
    db.prepare(
      `INSERT INTO deploy_logs (project_id, user_id, job_id, status)
       VALUES (?, ?, ?, 'queued')`,
    ).run(projectId, userId, jobId);

    return this.findByJobId(jobId);
  }

  async findByJobId(jobId) {
    return (
      db.prepare("SELECT * FROM deploy_logs WHERE job_id = ?").get(jobId) ??
      null
    );
  }

  async findByProject(projectId, { limit = 20, offset = 0 } = {}) {
    return db
      .prepare(
        `SELECT dl.*, u.username
           FROM deploy_logs dl
           JOIN users u ON u.id = dl.user_id
          WHERE dl.project_id = ?
          ORDER BY dl.created_at DESC
          LIMIT ? OFFSET ?`,
      )
      .all(projectId, limit, offset);
  }

  async updateStatus(jobId, { status, log, startedAt, finishedAt }) {
    db.prepare(
      `UPDATE deploy_logs
          SET status      = COALESCE(?, status),
              log         = COALESCE(?, log),
              started_at  = COALESCE(?, started_at),
              finished_at = COALESCE(?, finished_at)
        WHERE job_id = ?`,
    ).run(
      status ?? null,
      log ?? null,
      startedAt ?? null,
      finishedAt ?? null,
      jobId,
    );

    return this.findByJobId(jobId);
  }

  async findByUser(userId, { limit = 20, offset = 0 } = {}) {
    return db
      .prepare(
        `SELECT dl.*, p.name AS project_name
           FROM deploy_logs dl
           JOIN projects p ON p.id = dl.project_id
          WHERE dl.user_id = ?
          ORDER BY dl.created_at DESC
          LIMIT ? OFFSET ?`,
      )
      .all(userId, limit, offset);
  }
}
