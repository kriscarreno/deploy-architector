/**
 * src/controllers/projectController.js
 *
 * Handles HTTP request/response for project-related endpoints.
 * Delegates ALL business logic to ProjectService.
 * Input is validated with Joi schemas defined in this file.
 */
import Joi from "joi";
import { ValidationError } from "../utils/errors.js";

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

const createEnvFileSchema = Joi.object({
  branch: Joi.string().trim().min(1).max(255).required(),
  filename: Joi.string().trim().min(1).max(255).required(),
  content: Joi.string().allow("").default(""),
});

const updateEnvFileSchema = Joi.object({
  filename: Joi.string().trim().min(1).max(255).required(),
  content: Joi.string().allow("").default(""),
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

    async listEnvFiles(req, res) {
      const envFiles = await projectService.listEnvFiles(
        Number(req.params.id),
        Number(req.params.repoId),
        req.user.id,
      );
      res.json({ data: envFiles });
    },

    async createEnvFile(req, res) {
      const data = validate(createEnvFileSchema, req.body);
      const envFile = await projectService.createEnvFile(
        Number(req.params.id),
        Number(req.params.repoId),
        req.user.id,
        data.branch,
        data.filename,
        data.content,
      );
      res.status(201).json({ data: envFile });
    },

    async updateEnvFile(req, res) {
      const data = validate(updateEnvFileSchema, req.body);
      const envFile = await projectService.updateEnvFile(
        Number(req.params.id),
        Number(req.params.repoId),
        Number(req.params.envFileId),
        req.user.id,
        data.filename,
        data.content,
      );
      res.json({ data: envFile });
    },

    async deleteEnvFile(req, res) {
      await projectService.deleteEnvFile(
        Number(req.params.id),
        Number(req.params.repoId),
        Number(req.params.envFileId),
        req.user.id,
      );
      res.status(204).end();
    },
  };
}
