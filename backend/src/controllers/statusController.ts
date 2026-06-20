/**
 * src/controllers/statusController.js
 *
 * HTTP layer for per-project healthchecks, status config, and the public
 * status aggregate. Delegates to StatusService; { data } envelope.
 */
import Joi from "joi";
import { ValidationError } from "../utils/errors.js";

const healthcheckSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  // URL may be absolute or relative to the project's status_base_url
  url: Joi.string().trim().min(1).max(500).required(),
  orderIndex: Joi.number().integer().min(0).default(0),
});

const updateHealthcheckSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  url: Joi.string().trim().min(1).max(500),
  orderIndex: Joi.number().integer().min(0),
});

const statusConfigSchema = Joi.object({
  statusBaseUrl: Joi.string().trim().max(500).allow("", null),
  statusPublic: Joi.boolean(),
});

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
 * @param {import('../services/StatusService.js').StatusService} statusService
 */
export function makeStatusController(statusService) {
  return {
    async listHealthchecks(req, res) {
      const data = await statusService.listHealthchecks(
        Number(req.params.id),
        req.user.id,
      );
      res.json({ data });
    },

    async addHealthcheck(req, res) {
      const data = validate(healthcheckSchema, req.body);
      const hc = await statusService.addHealthcheck(
        Number(req.params.id),
        req.user.id,
        data,
      );
      res.status(201).json({ data: hc });
    },

    async updateHealthcheck(req, res) {
      const data = validate(updateHealthcheckSchema, req.body);
      const hc = await statusService.updateHealthcheck(
        Number(req.params.id),
        Number(req.params.hcId),
        req.user.id,
        data,
      );
      res.json({ data: hc });
    },

    async deleteHealthcheck(req, res) {
      await statusService.deleteHealthcheck(
        Number(req.params.id),
        Number(req.params.hcId),
        req.user.id,
      );
      res.status(204).end();
    },

    async getStatusConfig(req, res) {
      const data = await statusService.getStatusConfig(
        Number(req.params.id),
        req.user.id,
      );
      res.json({ data });
    },

    async setStatusConfig(req, res) {
      const data = validate(statusConfigSchema, req.body);
      const project = await statusService.setStatusConfig(
        Number(req.params.id),
        req.user.id,
        data,
      );
      res.json({ data: project });
    },

    // Public — no auth
    async getPublicStatus(_req, res) {
      const data = await statusService.getPublicStatus();
      res.json({ data });
    },
  };
}
