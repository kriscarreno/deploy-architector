/**
 * src/routes/configRoutes.ts
 *
 * Export / Import all project configuration for the authenticated user.
 *
 *   GET  /api/config/export   — download JSON bundle (projects + repos)
 *   POST /api/config/import   — create projects/repos from a JSON bundle
 *
 * Only project metadata and repo configuration is exported.
 * Deploy history and members are NOT included.
 */
import { Router } from "express";
import Joi from "joi";
import { requireAuth } from "../middlewares/requireAuth.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { ValidationError } from "../utils/errors.js";
import type { ProjectRepository } from "../repositories/ProjectRepository.js";
import type { RepoRepository } from "../repositories/RepoRepository.js";

// ── Export bundle schema ───────────────────────────────────────────────────
export interface ExportedRepo {
  name: string;
  github_url: string;
  order_index: number;
  prod_branch: string;
  main_branch: string;
}

export interface ExportedProject {
  name: string;
  description: string | null;
  atomic: number;
  cron_expression: string | null;
  cron_enabled: number;
  repos: ExportedRepo[];
}

export interface ConfigBundle {
  version: 1;
  exported_at: string;
  projects: ExportedProject[];
}

// ── Joi validation for import ─────────────────────────────────────────────
const repoSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  github_url: Joi.string().uri().required(),
  order_index: Joi.number().integer().min(0).default(0),
  prod_branch: Joi.string().trim().min(1).default("production"),
  main_branch: Joi.string().trim().min(1).default("main"),
});

const projectSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(500).allow("", null).default(null),
  atomic: Joi.number().integer().valid(0, 1).default(0),
  cron_expression: Joi.string().allow(null, "").default(null),
  cron_enabled: Joi.number().integer().valid(0, 1).default(0),
  repos: Joi.array().items(repoSchema).default([]),
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
          return {
            name: p.name,
            description: p.description,
            atomic: p.atomic,
            cron_expression: p.cron_expression ?? null,
            cron_enabled: p.cron_enabled,
            repos: repos.map((r) => ({
              name: r.name,
              github_url: r.github_url,
              order_index: r.order_index,
              prod_branch: r.prod_branch,
              main_branch: r.main_branch,
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
        // Create project owned by the importing user
        const project = await projectRepo.create({
          ownerId: user.id,
          name: p.name,
          description: p.description,
          atomic: Boolean(p.atomic),
        });

        if (!project) continue;

        // Set cron config if present (direct update — avoid scheduler dependency here)
        if (p.cron_expression) {
          await projectRepo.updateCron(project.id, {
            cronExpression: p.cron_expression,
            cronEnabled: Boolean(p.cron_enabled),
          });
        }

        // Create repos in order
        let reposCreated = 0;
        for (const r of p.repos) {
          await repoRepo.create({
            projectId: project.id,
            githubUrl: r.github_url,
            name: r.name,
            orderIndex: r.order_index,
            prodBranch: r.prod_branch,
            mainBranch: r.main_branch,
          });
          reposCreated++;
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
