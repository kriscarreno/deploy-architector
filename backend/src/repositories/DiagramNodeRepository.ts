/**
 * src/repositories/DiagramNodeRepository.js
 *
 * Data-access layer for the `diagram_nodes` table.
 */
import db from "../config/db.js";
import type { DiagramNode, NodeKind, NodeStatus } from "../types.js";

type CreatePayload = {
  diagramId: number;
  kind: NodeKind;
  projectId?: number | null;
  label: string;
  serviceType?: string | null;
  url?: string | null;
  healthcheckUrl?: string | null;
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
  posX?: number;
  posY?: number;
  posZ?: number;
};

type UpdatePayload = {
  label?: string;
  serviceType?: string | null;
  url?: string | null;
  healthcheckUrl?: string | null;
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
  projectId?: number | null;
};

export class DiagramNodeRepository {
  async findAllByDiagram(diagramId: number): Promise<DiagramNode[]> {
    return db
      .prepare(
        "SELECT * FROM diagram_nodes WHERE diagram_id = ? ORDER BY id ASC",
      )
      .all(diagramId) as unknown as DiagramNode[];
  }

  async findById(nodeId: number): Promise<DiagramNode | null> {
    return (
      (db
        .prepare("SELECT * FROM diagram_nodes WHERE id = ?")
        .get(nodeId) as unknown as DiagramNode | undefined) ?? null
    );
  }

  async create({
    diagramId,
    kind,
    projectId,
    label,
    serviceType,
    url,
    healthcheckUrl,
    icon,
    color,
    notes,
    posX = 0,
    posY = 0,
    posZ = 0,
  }: CreatePayload): Promise<DiagramNode | null> {
    const result = db
      .prepare(
        `INSERT INTO diagram_nodes
           (diagram_id, kind, project_id, label, service_type, url,
            healthcheck_url, icon, color, notes, pos_x, pos_y, pos_z)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        diagramId,
        kind,
        projectId ?? null,
        label,
        serviceType ?? null,
        url ?? null,
        healthcheckUrl ?? null,
        icon ?? null,
        color ?? null,
        notes ?? null,
        posX,
        posY,
        posZ,
      );
    return this.findById(Number(result.lastInsertRowid));
  }

  async update(
    nodeId: number,
    data: UpdatePayload,
  ): Promise<DiagramNode | null> {
    db.prepare(
      `UPDATE diagram_nodes
          SET label = COALESCE(?, label),
              service_type = COALESCE(?, service_type),
              url = COALESCE(?, url),
              healthcheck_url = COALESCE(?, healthcheck_url),
              icon = COALESCE(?, icon),
              color = COALESCE(?, color),
              notes = COALESCE(?, notes),
              project_id = COALESCE(?, project_id),
              updated_at = datetime('now')
        WHERE id = ?`,
    ).run(
      data.label ?? null,
      data.serviceType ?? null,
      data.url ?? null,
      data.healthcheckUrl ?? null,
      data.icon ?? null,
      data.color ?? null,
      data.notes ?? null,
      data.projectId ?? null,
      nodeId,
    );
    return this.findById(nodeId);
  }

  async updatePosition(
    nodeId: number,
    posX: number,
    posY: number,
    posZ: number,
  ): Promise<void> {
    db.prepare(
      `UPDATE diagram_nodes SET pos_x = ?, pos_y = ?, pos_z = ? WHERE id = ?`,
    ).run(posX, posY, posZ, nodeId);
  }

  async updateStatus(
    nodeId: number,
    status: NodeStatus,
  ): Promise<void> {
    db.prepare(
      `UPDATE diagram_nodes
          SET status = ?, last_checked_at = datetime('now')
        WHERE id = ?`,
    ).run(status, nodeId);
  }

  async delete(nodeId: number): Promise<void> {
    db.prepare("DELETE FROM diagram_nodes WHERE id = ?").run(nodeId);
  }

  /** All nodes (across diagrams) that have a non-empty healthcheck URL. */
  async findAllWithHealthcheck(): Promise<DiagramNode[]> {
    return db
      .prepare(
        `SELECT * FROM diagram_nodes
          WHERE healthcheck_url IS NOT NULL AND healthcheck_url <> ''`,
      )
      .all() as unknown as DiagramNode[];
  }
}
