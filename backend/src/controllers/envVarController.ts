/**
 * src/controllers/envVarController.ts
 *
 * HTTP layer for repo environment variable management.
 * All business logic is in EnvVarService.
 */
import Joi from "joi";
import { ValidationError } from "../utils/errors.js";
import type { EnvVarService } from "../services/EnvVarService.js";

// ── Validation schemas ────────────────────────────────────────────────────

const upsertSchema = Joi.object({
  branch: Joi.string().valid("main", "production").required(),
  key: Joi.string()
    .trim()
    .pattern(/^[A-Z_][A-Z0-9_]*$/i)
    .max(256)
    .required()
    .messages({
      "string.pattern.base":
        "key must be a valid env-var name (letters, digits, underscores)",
    }),
  value: Joi.string().allow("").max(4096).default(""),
  is_secret: Joi.boolean().default(false),
});

const updateSchema = Joi.object({
  value: Joi.string().allow("").max(4096),
  is_secret: Joi.boolean(),
}).min(1);

const bulkUpsertSchema = Joi.object({
  branch: Joi.string().valid("main", "production").required(),
  vars: Joi.array()
    .items(
      Joi.object({
        key: Joi.string()
          .trim()
          .pattern(/^[A-Z_][A-Z0-9_]*$/i)
          .max(256)
          .required(),
        value: Joi.string().allow("").max(4096).default(""),
        is_secret: Joi.boolean().default(false),
      }),
    )
    .min(1)
    .max(500)
    .required(),
});

function validate(schema: Joi.Schema, data: unknown) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    throw new ValidationError(
      "Validation failed",
      error.details.map((d) => d.message),
    );
  }
  return value;
}

// ── Controller factory ────────────────────────────────────────────────────

export function makeEnvVarController(envVarService: EnvVarService) {
  return {
    /**
     * GET /api/projects/:id/repos/:repoId/env?branch=main
     * Lists all env vars for a repo, optionally filtered by branch.
     */
    async list(req, res) {
      const repoId = Number(req.params.repoId);
      const branch = req.query.branch as string | undefined;
      const vars = await envVarService.list(repoId, req.user.id, branch);
      res.json({ data: vars });
    },

    /**
     * POST /api/projects/:id/repos/:repoId/env
     * Upsert an env var (insert or update by unique key+branch).
     */
    async upsert(req, res) {
      const repoId = Number(req.params.repoId);
      const { branch, key, value, is_secret } = validate(
        upsertSchema,
        req.body,
      );
      const envVar = await envVarService.upsert(
        repoId,
        req.user.id,
        branch,
        key,
        value,
        is_secret,
      );
      res.status(201).json({ data: envVar });
    },

    /**
     * PUT /api/projects/:id/repos/:repoId/env/:envId
     * Partial update of value and/or is_secret flag.
     */
    async update(req, res) {
      const repoId = Number(req.params.repoId);
      const envId = Number(req.params.envId);
      const { value, is_secret } = validate(updateSchema, req.body);
      const updated = await envVarService.update(repoId, envId, req.user.id, {
        value,
        isSecret: is_secret,
      });
      res.json({ data: updated });
    },

    /**
     * DELETE /api/projects/:id/repos/:repoId/env/:envId
     */
    async remove(req, res) {
      const repoId = Number(req.params.repoId);
      const envId = Number(req.params.envId);
      await envVarService.remove(repoId, envId, req.user.id);
      res.status(204).send();
    },

    /**
     * GET /api/projects/:id/repos/:repoId/env/export?branch=main
     * Downloads a .env file for the given branch.
     */
    async export(req, res) {
      const repoId = Number(req.params.repoId);
      const branch = (req.query.branch as string) ?? "main";
      const content = await envVarService.export(repoId, req.user.id, branch);

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=".env.${branch}"`,
      );
      res.send(content);
    },

    /**
     * POST /api/projects/:id/repos/:repoId/env/bulk
     * Bulk-upsert an array of variables parsed from a .env file paste.
     */
    async bulkUpsert(req, res) {
      const repoId = Number(req.params.repoId);
      const { branch, vars } = validate(bulkUpsertSchema, req.body);
      const entries = vars.map((v) => ({
        key: v.key,
        value: v.value,
        isSecret: v.is_secret,
      }));
      const count = await envVarService.bulkUpsert(
        repoId,
        req.user.id,
        branch,
        entries,
      );
      res.json({ data: { imported: count } });
    },
  };
}
