/**
 * src/controllers/diagramController.js
 *
 * HTTP layer for architecture-diagram endpoints (diagrams, nodes, edges,
 * layout, export/import). Delegates all logic to DiagramService.
 */
import Joi from "joi";
import { ValidationError } from "../utils/errors.js";

const createDiagramSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(1000).allow("", null),
  teamId: Joi.number().integer().allow(null),
});

const updateDiagramSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  description: Joi.string().trim().max(1000).allow("", null),
  teamId: Joi.number().integer().allow(null),
});

const nodeSchema = Joi.object({
  kind: Joi.string().valid("project", "external").required(),
  projectId: Joi.number().integer().allow(null),
  label: Joi.string().trim().min(1).max(120).required(),
  serviceType: Joi.string().trim().max(60).allow("", null),
  url: Joi.string().trim().max(500).allow("", null),
  healthcheckUrl: Joi.string().uri().max(500).allow("", null),
  icon: Joi.string().trim().max(60).allow("", null),
  color: Joi.string().trim().max(20).allow("", null),
  notes: Joi.string().trim().max(2000).allow("", null),
  posX: Joi.number().default(0),
  posY: Joi.number().default(0),
  posZ: Joi.number().default(0),
});

const updateNodeSchema = Joi.object({
  projectId: Joi.number().integer().allow(null),
  label: Joi.string().trim().min(1).max(120),
  serviceType: Joi.string().trim().max(60).allow("", null),
  url: Joi.string().trim().max(500).allow("", null),
  healthcheckUrl: Joi.string().uri().max(500).allow("", null),
  icon: Joi.string().trim().max(60).allow("", null),
  color: Joi.string().trim().max(20).allow("", null),
  notes: Joi.string().trim().max(2000).allow("", null),
});

const edgeSchema = Joi.object({
  sourceNodeId: Joi.number().integer().required(),
  targetNodeId: Joi.number().integer().required(),
  label: Joi.string().trim().max(120).allow("", null),
  edgeType: Joi.string().trim().max(60).allow("", null),
});

const updateEdgeSchema = Joi.object({
  label: Joi.string().trim().max(120).allow("", null),
  edgeType: Joi.string().trim().max(60).allow("", null),
  sourceNodeId: Joi.number().integer(),
  targetNodeId: Joi.number().integer(),
});

const layoutSchema = Joi.object({
  positions: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().required(),
        posX: Joi.number().required(),
        posY: Joi.number().required(),
        posZ: Joi.number().required(),
      }),
    )
    .required(),
});

const importSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  description: Joi.string().trim().max(1000).allow("", null),
  teamId: Joi.number().integer().allow(null),
  version: Joi.any(),
  nodes: Joi.array().default([]),
  edges: Joi.array().default([]),
}).unknown(true);

function validate(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error)
    throw new ValidationError(
      "Validation failed",
      error.details.map((d) => d.message),
    );
  return value;
}

/**
 * @param {import('../services/DiagramService.js').DiagramService} diagramService
 */
export function makeDiagramController(diagramService) {
  return {
    async listDiagrams(req, res) {
      const diagrams = await diagramService.listDiagrams(req.user.id);
      res.json({ data: diagrams });
    },

    async createDiagram(req, res) {
      const data = validate(createDiagramSchema, req.body);
      const diagram = await diagramService.createDiagram(req.user.id, data);
      res.status(201).json({ data: diagram });
    },

    async getDiagram(req, res) {
      const diagram = await diagramService.getDiagram(
        Number(req.params.id),
        req.user.id,
      );
      res.json({ data: diagram });
    },

    async updateDiagram(req, res) {
      const data = validate(updateDiagramSchema, req.body);
      const diagram = await diagramService.updateDiagram(
        Number(req.params.id),
        req.user.id,
        data,
      );
      res.json({ data: diagram });
    },

    async deleteDiagram(req, res) {
      await diagramService.deleteDiagram(Number(req.params.id), req.user.id);
      res.status(204).end();
    },

    async addNode(req, res) {
      const data = validate(nodeSchema, req.body);
      const node = await diagramService.addNode(
        Number(req.params.id),
        req.user.id,
        data,
      );
      res.status(201).json({ data: node });
    },

    async updateNode(req, res) {
      const data = validate(updateNodeSchema, req.body);
      const node = await diagramService.updateNode(
        Number(req.params.id),
        Number(req.params.nodeId),
        req.user.id,
        data,
      );
      res.json({ data: node });
    },

    async deleteNode(req, res) {
      await diagramService.deleteNode(
        Number(req.params.id),
        Number(req.params.nodeId),
        req.user.id,
      );
      res.status(204).end();
    },

    async saveLayout(req, res) {
      const { positions } = validate(layoutSchema, req.body);
      await diagramService.saveLayout(
        Number(req.params.id),
        req.user.id,
        positions,
      );
      res.status(204).end();
    },

    async addEdge(req, res) {
      const data = validate(edgeSchema, req.body);
      const edge = await diagramService.addEdge(
        Number(req.params.id),
        req.user.id,
        data,
      );
      res.status(201).json({ data: edge });
    },

    async updateEdge(req, res) {
      const data = validate(updateEdgeSchema, req.body);
      const edge = await diagramService.updateEdge(
        Number(req.params.id),
        Number(req.params.edgeId),
        req.user.id,
        data,
      );
      res.json({ data: edge });
    },

    async deleteEdge(req, res) {
      await diagramService.deleteEdge(
        Number(req.params.id),
        Number(req.params.edgeId),
        req.user.id,
      );
      res.status(204).end();
    },

    async exportDiagram(req, res) {
      const data = await diagramService.exportDiagram(
        Number(req.params.id),
        req.user.id,
      );
      res.json({ data });
    },

    async importDiagram(req, res) {
      const payload = validate(importSchema, req.body);
      const diagram = await diagramService.importDiagram(req.user.id, payload);
      res.status(201).json({ data: diagram });
    },
  };
}
