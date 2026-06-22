/**
 * src/routes/configRoutes.ts
 *
 * Export / Import all project configuration for the authenticated user.
 *
 *   GET  /api/config/export   — download JSON bundle
 *   POST /api/config/import   — recreate projects from a JSON bundle
 *
 * Includes: projects (+ status config), repos (+ urls/workflows), per-repo env
 * variables and env files, and per-project healthchecks. Deploy history and
 * members are NOT included. Backward compatible with v1 bundles that only had
 * project/repo metadata (new arrays default to empty).
 */
import { Router } from "express";
import Joi from "joi";
import { requireAuth } from "../middlewares/requireAuth.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";
import type { ProjectRepository } from "../repositories/ProjectRepository.js";
import type { RepoRepository } from "../repositories/RepoRepository.js";
import type { EnvVarRepository } from "../repositories/EnvVarRepository.js";
import type { RepoEnvFileRepository } from "../repositories/RepoEnvFileRepository.js";
import type { ProjectHealthcheckRepository } from "../repositories/ProjectHealthcheckRepository.js";
import type { EnvBranch } from "../types.js";

// ── Export bundle schema ───────────────────────────────────────────────────
export interface ExportedEnvVar {
  branch: string;
  key: string;
  value: string;
  is_secret: number;
}

export interface ExportedEnvFile {
  branch: string;
  filename: string;
  content: string;
}

export interface ExportedRepo {
  name: string;
  github_url: string;
  order_index: number;
  prod_branch: string;
  main_branch: string;
  main_url: string | null;
  prod_url: string | null;
  main_workflow_file: string;
  prod_workflow_file: string;
  env_vars: ExportedEnvVar[];
  env_files: ExportedEnvFile[];
}

export interface ExportedHealthcheck {
  name: string;
  url: string;
  order_index: number;
}

export interface ExportedProject {
  name: string;
  description: string | null;
  atomic: number;
  cron_expression: string | null;
  cron_enabled: number;
  status_base_url: string | null;
  status_public: number;
  repos: ExportedRepo[];
  healthchecks: ExportedHealthcheck[];
}

export interface ConfigBundle {
  version: 1;
  exported_at: string;
  projects: ExportedProject[];
}

// ── Joi validation for import ─────────────────────────────────────────────
const envVarSchema = Joi.object({
  branch: Joi.string().trim().min(1).required(),
  key: Joi.string().trim().min(1).required(),
  value: Joi.string().allow("").default(""),
  is_secret: Joi.number().integer().valid(0, 1).default(0),
});

const envFileSchema = Joi.object({
  branch: Joi.string().allow("").default(""),
  filename: Joi.string().trim().min(1).required(),
  content: Joi.string().allow("").default(""),
});

const repoSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  github_url: Joi.string().uri().required(),
  order_index: Joi.number().integer().min(0).default(0),
  prod_branch: Joi.string().trim().min(1).default("production"),
  main_branch: Joi.string().trim().min(1).default("main"),
  main_url: Joi.string().trim().allow("", null).default(null),
  prod_url: Joi.string().trim().allow("", null).default(null),
  main_workflow_file: Joi.string().trim().allow("", null).default("deploy.yml"),
  prod_workflow_file: Joi.string().trim().allow("", null).default("deploy.yml"),
  env_vars: Joi.array().items(envVarSchema).default([]),
  env_files: Joi.array().items(envFileSchema).default([]),
});

const healthcheckSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  url: Joi.string().trim().min(1).max(500).required(),
  order_index: Joi.number().integer().min(0).default(0),
});

const projectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).allow("", null).default(null),
  atomic: Joi.number().integer().valid(0, 1).default(0),
  cron_expression: Joi.string().allow(null, "").default(null),
  cron_enabled: Joi.number().integer().valid(0, 1).default(0),
  status_base_url: Joi.string().trim().allow("", null).default(null),
  status_public: Joi.number().integer().valid(0, 1).default(0),
  repos: Joi.array().items(repoSchema).default([]),
  healthchecks: Joi.array().items(healthcheckSchema).default([]),
});

const bundleSchema = Joi.object({
  version: Joi.number().valid(1).required(),
  exported_at: Joi.string().isoDate().required(),
  projects: Joi.array().items(projectSchema).min(1).required(),
});

// ── Factory ───────────────────────────────────────────────────────────────
export function makeConfigRouter(
  projectRepo: ProjectRepository,
  repoRepo: RepoRepository,
  envVarRepo: EnvVarRepository,
  repoEnvFileRepo: RepoEnvFileRepository,
  healthcheckRepo: ProjectHealthcheckRepository,
) {
  const router = Router();
  router.use(requireAuth);

  // ── GET /api/config/export ──────────────────────────────────────────────
  router.get(
    "/export",
    asyncHandler(async (req, res) => {
      const user = req.user as Express.User;
      const projects = await projectRepo.findAllByUser(user.id);

      const exported: ExportedProject[] = await Promise.all(
        projects.map(async (p) => {
          const repos = await repoRepo.findAllByProject(p.id);
          const healthchecks = await healthcheckRepo.findAllByProject(p.id);
          return {
            name: p.name,
            description: p.description,
            atomic: p.atomic,
            cron_expression: p.cron_expression ?? null,
            cron_enabled: p.cron_enabled,
            status_base_url: p.status_base_url ?? null,
            status_public: p.status_public ?? 0,
            repos: repos.map((r) => ({
              name: r.name,
              github_url: r.github_url,
              order_index: r.order_index,
              prod_branch: r.prod_branch,
              main_branch: r.main_branch,
              main_url: r.main_url ?? null,
              prod_url: r.prod_url ?? null,
              main_workflow_file: r.main_workflow_file ?? "deploy.yml",
              prod_workflow_file: r.prod_workflow_file ?? "deploy.yml",
              env_vars: envVarRepo.findByRepo(r.id).map((v) => ({
                branch: v.branch,
                key: v.key,
                value: v.value,
                is_secret: v.is_secret,
              })),
              env_files: repoEnvFileRepo.findAllByRepo(r.id).map((f) => ({
                branch: f.branch,
                filename: f.filename,
                content: f.content,
              })),
            })),
            healthchecks: healthchecks.map((h) => ({
              name: h.name,
              url: h.url,
              order_index: h.order_index,
            })),
          };
        }),
      );

      const bundle: ConfigBundle = {
        version: 1,
        exported_at: new Date().toISOString(),
        projects: exported,
      };

      const filename = `deploy-config-${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.json(bundle);
    }),
  );

  // ── POST /api/config/import ─────────────────────────────────────────────
  router.post(
    "/import",
    asyncHandler(async (req, res) => {
      const user = req.user as Express.User;

      const { error, value: bundle } = bundleSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        throw new ValidationError(
          "Bundle inválido",
          error.details.map((d) => d.message),
        );
      }

      const created: Array<{ project: string; repos: number }> = [];

      for (const p of bundle.projects as ExportedProject[]) {
        const project = await projectRepo.create({
          ownerId: user.id,
          name: p.name,
          description: p.description,
          atomic: Boolean(p.atomic),
        });

        if (!project) continue;

        if (p.cron_expression) {
          await projectRepo.updateCron(project.id, {
            cronExpression: p.cron_expression,
            cronEnabled: Boolean(p.cron_enabled),
          });
        }

        // Status config (base URL + public flag)
        if (p.status_base_url || p.status_public) {
          await projectRepo.updateStatusConfig(project.id, {
            statusBaseUrl: p.status_base_url ?? null,
            statusPublic: Boolean(p.status_public),
          });
        }

        // Healthchecks
        for (const h of p.healthchecks ?? []) {
          await healthcheckRepo.create({
            projectId: project.id,
            name: h.name,
            url: h.url,
            orderIndex: h.order_index,
          });
        }

        // Repos + their env vars / env files
        let reposCreated = 0;
        for (const r of p.repos) {
          const repo = await repoRepo.create({
            projectId: project.id,
            githubUrl: r.github_url,
            name: r.name,
            orderIndex: r.order_index,
            prodBranch: r.prod_branch,
            mainBranch: r.main_branch,
            mainUrl: r.main_url ?? null,
            prodUrl: r.prod_url ?? null,
            mainWorkflowFile: r.main_workflow_file ?? "deploy.yml",
            prodWorkflowFile: r.prod_workflow_file ?? "deploy.yml",
          });
          reposCreated++;
          if (!repo) continue;

          if (r.env_vars?.length) {
            envVarRepo.bulkUpsert(
              r.env_vars.map((v) => ({
                repoId: repo.id,
                branch: v.branch as EnvBranch,
                key: v.key,
                value: v.value,
                isSecret: Boolean(v.is_secret),
              })),
            );
          }

          for (const f of r.env_files ?? []) {
            repoEnvFileRepo.create(repo.id, f.branch, f.filename, f.content);
          }
        }

        created.push({ project: project.name, repos: reposCreated });
      }

      res.status(201).json({
        data: { imported: created.length, projects: created },
      });
    }),
  );

  return router;
}
