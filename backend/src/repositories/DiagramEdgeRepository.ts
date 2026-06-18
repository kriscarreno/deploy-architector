/**
 * src/repositories/DiagramEdgeRepository.js
 *
 * Data-access layer for the `diagram_edges` table.
 */
import db from "../config/db.js";
import type { DiagramEdge } from "../types.js";

type CreatePayload = {
  diagramId: number;
  sourceNodeId: number;
  targetNodeId: number;
  label?: string | null;
  edgeType?: string | null;
};

export class DiagramEdgeRepository {
  async findAllByDiagram(diagramId: number): Promise<DiagramEdge[]> {
    return db
      .prepare(
        "SELECT * FROM diagram_edges WHERE diagram_id = ? ORDER BY id ASC",
      )
      .all(diagramId) as unknown as DiagramEdge[];
  }

  async findById(edgeId: number): Promise<DiagramEdge | null> {
    return (
      (db
        .prepare("SELECT * FROM diagram_edges WHERE id = ?")
        .get(edgeId) as unknown as DiagramEdge | undefined) ?? null
    );
  }

  async create({
    diagramId,
    sourceNodeId,
    targetNodeId,
    label,
    edgeType,
  }: CreatePayload): Promise<DiagramEdge | null> {
    const result = db
      .prepare(
        `INSERT INTO diagram_edges
           (diagram_id, source_node_id, target_node_id, label, edge_type)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(diagram_id, source_node_id, target_node_id)
           DO UPDATE SET label = excluded.label, edge_type = excluded.edge_type`,
      )
      .run(
        diagramId,
        sourceNodeId,
        targetNodeId,
        label ?? null,
        edgeType ?? null,
      );
    // lastInsertRowid is 0 on a conflict-update, so look the edge up by key
    const row = db
      .prepare(
        `SELECT * FROM diagram_edges
          WHERE diagram_id = ? AND source_node_id = ? AND target_node_id = ?`,
      )
      .get(diagramId, sourceNodeId, targetNodeId) as unknown as
      | DiagramEdge
      | undefined;
    return row ?? this.findById(Number(result.lastInsertRowid));
  }

  async update(
    edgeId: number,
    {
      label,
      edgeType,
      sourceNodeId,
      targetNodeId,
    }: {
      label?: string | null;
      edgeType?: string | null;
      sourceNodeId?: number | null;
      targetNodeId?: number | null;
    },
  ): Promise<DiagramEdge | null> {
    db.prepare(
      `UPDATE diagram_edges
          SET label = COALESCE(?, label),
              edge_type = COALESCE(?, edge_type),
              source_node_id = COALESCE(?, source_node_id),
              target_node_id = COALESCE(?, target_node_id)
        WHERE id = ?`,
    ).run(
      label ?? null,
      edgeType ?? null,
      sourceNodeId ?? null,
      targetNodeId ?? null,
      edgeId,
    );
    return this.findById(edgeId);
  }

  async delete(edgeId: number): Promise<void> {
    db.prepare("DELETE FROM diagram_edges WHERE id = ?").run(edgeId);
  }
}
