/**
 * src/services/DiagramService.js
 *
 * Business-logic layer for architecture diagrams: the diagram itself,
 * its nodes (project references or external services) and the directed
 * edges between them. Enforces access (owner OR team member) and validates
 * that project-kind nodes reference a project the user can actually see.
 *
 * Also handles portable JSON export/import (no DB ids; projects referenced
 * by name so a diagram can be moved between users/environments).
 */
import type { DiagramRepository } from "../repositories/DiagramRepository.js";
import type { DiagramNodeRepository } from "../repositories/DiagramNodeRepository.js";
import type { DiagramEdgeRepository } from "../repositories/DiagramEdgeRepository.js";
import type { ProjectRepository } from "../repositories/ProjectRepository.js";
import type { TeamRepository } from "../repositories/TeamRepository.js";
import type {
  Diagram,
  DiagramEdge,
  DiagramNode,
  DiagramWithGraph,
  NodeKind,
} from "../types.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../utils/errors.js";
import db from "../config/db.js";

type NodeInput = {
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

const EXPORT_VERSION = 1;

export class DiagramService {
  private diagramRepo: DiagramRepository;
  private nodeRepo: DiagramNodeRepository;
  private edgeRepo: DiagramEdgeRepository;
  private projectRepo: ProjectRepository;
  private teamRepo: TeamRepository;

  constructor(
    diagramRepo: DiagramRepository,
    nodeRepo: DiagramNodeRepository,
    edgeRepo: DiagramEdgeRepository,
    projectRepo: ProjectRepository,
    teamRepo: TeamRepository,
  ) {
    this.diagramRepo = diagramRepo;
    this.nodeRepo = nodeRepo;
    this.edgeRepo = edgeRepo;
    this.projectRepo = projectRepo;
    this.teamRepo = teamRepo;
  }

  // ── Diagrams ───────────────────────────────────────────────────────────────

  async listDiagrams(userId: number): Promise<Diagram[]> {
    return this.diagramRepo.findAllByUser(userId);
  }

  async createDiagram(
    userId: number,
    data: { name: string; description?: string | null; teamId?: number | null },
  ): Promise<Diagram | null> {
    if (data.teamId != null) await this.assertTeamMember(data.teamId, userId);
    return this.diagramRepo.create({ ownerId: userId, ...data });
  }

  private async assertAccess(diagramId: number, userId: number): Promise<Diagram> {
    const diagram = await this.diagramRepo.findById(diagramId);
    if (!diagram) throw new NotFoundError("Diagram not found");
    if (!(await this.diagramRepo.canAccess(diagramId, userId)))
      throw new ForbiddenError();
    return diagram;
  }

  private async assertTeamMember(teamId: number, userId: number): Promise<void> {
    if (!(await this.teamRepo.isMember(teamId, userId)))
      throw new ForbiddenError("You are not a member of that team");
  }

  async getDiagram(
    diagramId: number,
    userId: number,
  ): Promise<DiagramWithGraph> {
    const diagram = await this.assertAccess(diagramId, userId);
    const nodes = await this.nodeRepo.findAllByDiagram(diagramId);
    const edges = await this.edgeRepo.findAllByDiagram(diagramId);
    return { ...diagram, nodes, edges };
  }

  async updateDiagram(
    diagramId: number,
    userId: number,
    data: { name?: string; description?: string | null; teamId?: number | null },
  ): Promise<Diagram | null> {
    await this.assertAccess(diagramId, userId);
    if (data.teamId != null) await this.assertTeamMember(data.teamId, userId);
    return this.diagramRepo.update(diagramId, data);
  }

  async deleteDiagram(diagramId: number, userId: number): Promise<void> {
    const diagram = await this.diagramRepo.findById(diagramId);
    if (!diagram) throw new NotFoundError("Diagram not found");
    if (diagram.owner_id !== userId)
      throw new ForbiddenError("Only the owner can delete a diagram");
    return this.diagramRepo.delete(diagramId);
  }

  // ── Nodes ───────────────────────────────────────────────────────────────────

  async addNode(
    diagramId: number,
    userId: number,
    input: NodeInput,
  ): Promise<DiagramNode | null> {
    await this.assertAccess(diagramId, userId);
    await this.validateNode(userId, input);
    const node = await this.nodeRepo.create({ diagramId, ...input });
    await this.diagramRepo.touch(diagramId);
    return node;
  }

  async updateNode(
    diagramId: number,
    nodeId: number,
    userId: number,
    input: Partial<NodeInput>,
  ): Promise<DiagramNode | null> {
    await this.assertAccess(diagramId, userId);
    const node = await this.nodeRepo.findById(nodeId);
    if (!node || node.diagram_id !== diagramId)
      throw new NotFoundError("Node not found");
    if (input.projectId != null)
      await this.assertProjectAccess(userId, input.projectId);
    const updated = await this.nodeRepo.update(nodeId, input);
    await this.diagramRepo.touch(diagramId);
    return updated;
  }

  async deleteNode(
    diagramId: number,
    nodeId: number,
    userId: number,
  ): Promise<void> {
    await this.assertAccess(diagramId, userId);
    const node = await this.nodeRepo.findById(nodeId);
    if (!node || node.diagram_id !== diagramId)
      throw new NotFoundError("Node not found");
    await this.nodeRepo.delete(nodeId);
    await this.diagramRepo.touch(diagramId);
  }

  /** Batch-persist 3D positions after a drag. */
  async saveLayout(
    diagramId: number,
    userId: number,
    positions: { id: number; posX: number; posY: number; posZ: number }[],
  ): Promise<void> {
    await this.assertAccess(diagramId, userId);
    const valid = await this.nodeRepo.findAllByDiagram(diagramId);
    const validIds = new Set(valid.map((n) => n.id));
    for (const p of positions) {
      if (validIds.has(p.id))
        await this.nodeRepo.updatePosition(p.id, p.posX, p.posY, p.posZ);
    }
    await this.diagramRepo.touch(diagramId);
  }

  // ── Edges ───────────────────────────────────────────────────────────────────

  async addEdge(
    diagramId: number,
    userId: number,
    input: {
      sourceNodeId: number;
      targetNodeId: number;
      label?: string | null;
      edgeType?: string | null;
    },
  ): Promise<DiagramEdge | null> {
    await this.assertAccess(diagramId, userId);
    if (input.sourceNodeId === input.targetNodeId)
      throw new ValidationError("An edge cannot connect a node to itself");
    const nodes = await this.nodeRepo.findAllByDiagram(diagramId);
    const ids = new Set(nodes.map((n) => n.id));
    if (!ids.has(input.sourceNodeId) || !ids.has(input.targetNodeId))
      throw new ValidationError("Edge endpoints must belong to this diagram");
    const edge = await this.edgeRepo.create({ diagramId, ...input });
    await this.diagramRepo.touch(diagramId);
    return edge;
  }

  async updateEdge(
    diagramId: number,
    edgeId: number,
    userId: number,
    data: {
      label?: string | null;
      edgeType?: string | null;
      sourceNodeId?: number | null;
      targetNodeId?: number | null;
    },
  ): Promise<DiagramEdge | null> {
    await this.assertAccess(diagramId, userId);
    const edge = await this.edgeRepo.findById(edgeId);
    if (!edge || edge.diagram_id !== diagramId)
      throw new NotFoundError("Edge not found");

    // If endpoints change (e.g. reversing direction), validate them
    if (data.sourceNodeId != null || data.targetNodeId != null) {
      const src = data.sourceNodeId ?? edge.source_node_id;
      const tgt = data.targetNodeId ?? edge.target_node_id;
      if (src === tgt)
        throw new ValidationError("An edge cannot connect a node to itself");
      const nodes = await this.nodeRepo.findAllByDiagram(diagramId);
      const ids = new Set(nodes.map((n) => n.id));
      if (!ids.has(src) || !ids.has(tgt))
        throw new ValidationError("Edge endpoints must belong to this diagram");
    }

    const updated = await this.edgeRepo.update(edgeId, data);
    await this.diagramRepo.touch(diagramId);
    return updated;
  }

  async deleteEdge(
    diagramId: number,
    edgeId: number,
    userId: number,
  ): Promise<void> {
    await this.assertAccess(diagramId, userId);
    const edge = await this.edgeRepo.findById(edgeId);
    if (!edge || edge.diagram_id !== diagramId)
      throw new NotFoundError("Edge not found");
    await this.edgeRepo.delete(edgeId);
    await this.diagramRepo.touch(diagramId);
  }

  // ── Export / Import (portable JSON) ──────────────────────────────────────────

  async exportDiagram(
    diagramId: number,
    userId: number,
  ): Promise<Record<string, unknown>> {
    const { nodes, edges, ...diagram } = await this.getDiagram(
      diagramId,
      userId,
    );

    // Resolve project ids → names so the export is portable across DBs
    const projectNames = new Map<number, string>();
    for (const n of nodes) {
      if (n.project_id != null && !projectNames.has(n.project_id)) {
        const p = await this.projectRepo.findById(n.project_id);
        if (p) projectNames.set(n.project_id, p.name);
      }
    }

    return {
      version: EXPORT_VERSION,
      name: diagram.name,
      description: diagram.description,
      nodes: nodes.map((n) => ({
        ref: `n${n.id}`, // local id used only to wire edges within the file
        kind: n.kind,
        projectName: n.project_id != null ? projectNames.get(n.project_id) ?? null : null,
        label: n.label,
        serviceType: n.service_type,
        url: n.url,
        healthcheckUrl: n.healthcheck_url,
        icon: n.icon,
        color: n.color,
        notes: n.notes,
        posX: n.pos_x,
        posY: n.pos_y,
        posZ: n.pos_z,
      })),
      edges: edges.map((e) => ({
        source: `n${e.source_node_id}`,
        target: `n${e.target_node_id}`,
        label: e.label,
        edgeType: e.edge_type,
      })),
    };
  }

  async importDiagram(
    userId: number,
    payload: {
      name?: string;
      description?: string | null;
      teamId?: number | null;
      nodes?: ImportNode[];
      edges?: ImportEdge[];
    },
  ): Promise<DiagramWithGraph> {
    if (payload.teamId != null)
      await this.assertTeamMember(payload.teamId, userId);

    const name = (payload.name ?? "Imported diagram").trim() || "Imported diagram";
    const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
    const edges = Array.isArray(payload.edges) ? payload.edges : [];

    // Pre-resolve project names the importing user can access
    const accessibleProjects = await this.projectRepo.findAllByUser(userId);
    const projectByName = new Map<string, number>();
    for (const p of accessibleProjects) projectByName.set(p.name, p.id);

    // node "ref" in the file → created DB id
    const refToId = new Map<string, number>();

    db.exec("BEGIN");
    try {
      const diagram = this.createDiagramSync(userId, name, payload.description ?? null, payload.teamId ?? null);

      for (const n of nodes) {
        const kind: NodeKind = n.kind === "project" ? "project" : "external";
        const projectId =
          kind === "project" && n.projectName
            ? projectByName.get(n.projectName) ?? null
            : null;
        const id = this.createNodeSync(diagram.id, kind, projectId, n);
        if (n.ref) refToId.set(n.ref, id);
      }

      for (const e of edges) {
        const src = e.source ? refToId.get(e.source) : undefined;
        const tgt = e.target ? refToId.get(e.target) : undefined;
        if (src && tgt && src !== tgt)
          this.createEdgeSync(diagram.id, src, tgt, e.label ?? null, e.edgeType ?? null);
      }

      db.exec("COMMIT");
      return this.getDiagram(diagram.id, userId);
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }

  // ── Validation helpers ────────────────────────────────────────────────────

  private async validateNode(userId: number, input: NodeInput): Promise<void> {
    if (input.kind === "project") {
      if (input.projectId == null)
        throw new ValidationError("A project node requires projectId");
      await this.assertProjectAccess(userId, input.projectId);
    }
  }

  private async assertProjectAccess(
    userId: number,
    projectId: number,
  ): Promise<void> {
    if (!(await this.projectRepo.isMember(projectId, userId)))
      throw new ForbiddenError("You don't have access to that project");
  }

  // ── Synchronous helpers used inside the import transaction ─────────────────
  // node:sqlite is synchronous, so these run safely within BEGIN/COMMIT.

  private createDiagramSync(
    userId: number,
    name: string,
    description: string | null,
    teamId: number | null,
  ): Diagram {
    const result = db
      .prepare(
        `INSERT INTO diagrams (owner_id, name, description, team_id)
         VALUES (?, ?, ?, ?)`,
      )
      .run(userId, name, description, teamId);
    return db
      .prepare("SELECT * FROM diagrams WHERE id = ?")
      .get(Number(result.lastInsertRowid)) as unknown as Diagram;
  }

  private createNodeSync(
    diagramId: number,
    kind: NodeKind,
    projectId: number | null,
    n: ImportNode,
  ): number {
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
        projectId,
        String(n.label ?? "Node"),
        n.serviceType ?? null,
        n.url ?? null,
        n.healthcheckUrl ?? null,
        n.icon ?? null,
        n.color ?? null,
        n.notes ?? null,
        Number(n.posX ?? 0),
        Number(n.posY ?? 0),
        Number(n.posZ ?? 0),
      );
    return Number(result.lastInsertRowid);
  }

  private createEdgeSync(
    diagramId: number,
    sourceNodeId: number,
    targetNodeId: number,
    label: string | null,
    edgeType: string | null,
  ): void {
    db.prepare(
      `INSERT OR IGNORE INTO diagram_edges
         (diagram_id, source_node_id, target_node_id, label, edge_type)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(diagramId, sourceNodeId, targetNodeId, label, edgeType);
  }
}

type ImportNode = {
  ref?: string;
  kind?: string;
  projectName?: string | null;
  label?: string;
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

type ImportEdge = {
  source?: string;
  target?: string;
  label?: string | null;
  edgeType?: string | null;
};
