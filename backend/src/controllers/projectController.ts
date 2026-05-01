/**
 * src/controllers/projectController.js
 *
 * Handles HTTP request/response for project-related endpoints.
 * Delegates ALL business logic to ProjectService.
 * Input is validated with Joi schemas defined in this file.
 */
import Joi from "joi";
import { ValidationError } from "../utils/errors.js";
import { scheduler } from "../config/scheduler.js";

// ── Validation schemas ────────────────────────────────────────────────────

const createProjectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).allow("", null),
  atomic: Joi.boolean().default(false),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  description: Joi.string().trim().max(500).allow("", null),
  atomic: Joi.boolean(),
});

const updateCronSchema = Joi.object({
  cron_expression: Joi.string().allow(null, "").default(null),
  cron_enabled: Joi.boolean().required(),
});

// Accepts the frontend's field names (snake_case) and maps to repo schema
const addRepoSchema = Joi.object({
  git_url: Joi.string().uri().required(),
  main_branch: Joi.string().default("main"),
  production_branch: Joi.string().default("production"),
  order: Joi.number().integer().min(0).default(0),
});

const updateRepoSchema = Joi.object({
  git_url: Joi.string().uri(),
  main_branch: Joi.string(),
  production_branch: Joi.string(),
  order: Joi.number().integer().min(0),
});

function validate(schema, data) {
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

/**
 * Returns controller methods bound to the injected service.
 * This pattern keeps controllers stateless and testable.
 *
 * @param {import('../services/ProjectService.js').ProjectService} projectService
 */
export function makeProjectController(projectService) {
  return {
    async listProjects(req, res) {
      const projects = await projectService.listProjects(req.user.id);
      res.json({ data: projects });
    },

    async createProject(req, res) {
      const data = validate(createProjectSchema, req.body);
      const project = await projectService.createProject(req.user.id, data);
      res.status(201).json({ data: project });
    },

    async listRepos(req, res) {
      const repos = await projectService.listRepos(
        Number(req.params.id),
        req.user.id,
      );
      res.json({ data: repos });
    },

    async addRepo(req, res) {
      const data = validate(addRepoSchema, req.body);
      // Derive repo name from the git URL (last path segment without .git)
      const repoName =
        data.git_url
          .split("/")
          .pop()
          .replace(/\.git$/, "") || "repo";
      const repo = await projectService.addRepo(
        Number(req.params.id),
        req.user.id,
        {
          githubUrl: data.git_url,
          name: repoName,
          mainBranch: data.main_branch,
          prodBranch: data.production_branch,
          orderIndex: data.order,
        },
      );
      res.status(201).json({ data: repo });
    },

    async getProject(req, res) {
      const project = await projectService.getProjectWithRepos(
        Number(req.params.id),
        req.user.id,
      );
      res.json({ data: project });
    },

    async updateProject(req, res) {
      const data = validate(updateProjectSchema, req.body);
      const project = await projectService.updateProject(
        Number(req.params.id),
        req.user.id,
        data,
      );
      res.json({ data: project });
    },

    async deleteProject(req, res) {
      await projectService.deleteProject(Number(req.params.id), req.user.id);
      res.status(204).end();
    },

    async deleteRepo(req, res) {
      await projectService.deleteRepo(
        Number(req.params.id),
        Number(req.params.repoId),
        req.user.id,
      );
      res.status(204).end();
    },

    async updateRepo(req, res) {
      const data = validate(updateRepoSchema, req.body);
      const repoName = data.git_url
        ? data.git_url
            .split("/")
            .pop()
            .replace(/\.git$/, "") || undefined
        : undefined;
      const repo = await projectService.updateRepo(
        Number(req.params.id),
        Number(req.params.repoId),
        req.user.id,
        {
          githubUrl: data.git_url,
          name: repoName,
          mainBranch: data.main_branch,
          prodBranch: data.production_branch,
          orderIndex: data.order,
        },
      );
      res.json({ data: repo });
    },

    async getProjectDiff(req, res) {
      const diffs = await projectService.getRepoDiffs(
        Number(req.params.id),
        req.user.id,
        req.user.access_token,
      );
      res.json({ data: diffs });
    },

    async updateCronConfig(req, res) {
      const data = validate(updateCronSchema, req.body);

      // Validate cron expression format when providing one
      if (data.cron_enabled && data.cron_expression) {
        if (!scheduler.validate(data.cron_expression)) {
          throw new ValidationError("Invalid cron expression", [
            "La expresión cron no es válida. Usa formato: minuto hora día-mes mes día-semana",
          ]);
        }
      }

      const project = await projectService.updateCronConfig(
        Number(req.params.id),
        req.user.id,
        {
          cronExpression: data.cron_expression || null,
          cronEnabled: data.cron_enabled,
        },
      );
      res.json({ data: project });
    },
  };
}
