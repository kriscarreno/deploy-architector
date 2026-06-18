/**
 * @file diagramService.js
 * @description CRUD de diagramas de arquitectura, sus nodos y conexiones,
 * más exportación/importación de la configuración como JSON.
 */
import apiClient from "./apiClient";
import type { Diagram, DiagramEdge, DiagramNode, DiagramWithGraph } from "../types";

export interface NodePayload {
  kind: "project" | "external";
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
}

const diagramService = {
  getAll(): Promise<Diagram[]> {
    return apiClient.get("/api/diagrams").then((r) => r.data.data);
  },

  getById(id: number | string): Promise<DiagramWithGraph> {
    return apiClient.get(`/api/diagrams/${id}`).then((r) => r.data.data);
  },

  create(payload: {
    name: string;
    description?: string | null;
    teamId?: number | null;
  }): Promise<Diagram> {
    return apiClient.post("/api/diagrams", payload).then((r) => r.data.data);
  },

  update(
    id: number | string,
    payload: { name?: string; description?: string | null; teamId?: number | null },
  ): Promise<Diagram> {
    return apiClient
      .put(`/api/diagrams/${id}`, payload)
      .then((r) => r.data.data);
  },

  delete(id: number | string): Promise<void> {
    return apiClient.delete(`/api/diagrams/${id}`).then(() => undefined);
  },

  // ── Nodes ─────────────────────────────────────────────────────────────────

  addNode(id: number | string, payload: NodePayload): Promise<DiagramNode> {
    return apiClient
      .post(`/api/diagrams/${id}/nodes`, payload)
      .then((r) => r.data.data);
  },

  updateNode(
    id: number | string,
    nodeId: number,
    payload: Partial<NodePayload>,
  ): Promise<DiagramNode> {
    return apiClient
      .put(`/api/diagrams/${id}/nodes/${nodeId}`, payload)
      .then((r) => r.data.data);
  },

  deleteNode(id: number | string, nodeId: number): Promise<void> {
    return apiClient
      .delete(`/api/diagrams/${id}/nodes/${nodeId}`)
      .then(() => undefined);
  },

  saveLayout(
    id: number | string,
    positions: { id: number; posX: number; posY: number; posZ: number }[],
  ): Promise<void> {
    return apiClient
      .patch(`/api/diagrams/${id}/layout`, { positions })
      .then(() => undefined);
  },

  // ── Edges ─────────────────────────────────────────────────────────────────

  addEdge(
    id: number | string,
    payload: {
      sourceNodeId: number;
      targetNodeId: number;
      label?: string | null;
      edgeType?: string | null;
    },
  ): Promise<DiagramEdge> {
    return apiClient
      .post(`/api/diagrams/${id}/edges`, payload)
      .then((r) => r.data.data);
  },

  updateEdge(
    id: number | string,
    edgeId: number,
    payload: {
      label?: string | null;
      edgeType?: string | null;
      sourceNodeId?: number;
      targetNodeId?: number;
    },
  ): Promise<DiagramEdge> {
    return apiClient
      .put(`/api/diagrams/${id}/edges/${edgeId}`, payload)
      .then((r) => r.data.data);
  },

  deleteEdge(id: number | string, edgeId: number): Promise<void> {
    return apiClient
      .delete(`/api/diagrams/${id}/edges/${edgeId}`)
      .then(() => undefined);
  },

  // ── Export / Import ─────────────────────────────────────────────────────────

  /** Descarga el diagrama como JSON re-importable. */
  async exportToFile(id: number | string, name: string): Promise<void> {
    const data = await apiClient
      .get(`/api/diagrams/${id}/export`)
      .then((r) => r.data.data);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9-_]+/gi, "_") || "diagram"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  import(
    payload: Record<string, unknown> & { teamId?: number | null },
  ): Promise<DiagramWithGraph> {
    return apiClient
      .post("/api/diagrams/import", payload)
      .then((r) => r.data.data);
  },
};

export default diagramService;
