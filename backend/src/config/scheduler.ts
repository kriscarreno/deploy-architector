/**
 * src/config/scheduler.ts
 *
 * Singleton cron scheduler.
 * Manages one node-cron task per project that has cron_enabled = 1.
 *
 * Usage:
 *   scheduler.init(deployService, projectRepo);
 *   await scheduler.loadAll();           // on startup
 *   scheduler.upsertJob(project);        // after cron config updated via API
 *   scheduler.removeJob(projectId);      // after project deleted
 */
import cron from "node-cron";
import type { DeployService } from "../services/DeployService.js";
import type { ProjectRepository } from "../repositories/ProjectRepository.js";
import type { Project } from "../types.js";
import logger from "./logger.js";

type ScheduledTask = ReturnType<typeof cron.schedule>;

class CronScheduler {
  private tasks = new Map<number, ScheduledTask>();
  private deployService: DeployService | null = null;
  private projectRepo: ProjectRepository | null = null;

  /** Call once from server.ts before loadAll(). */
  init(deployService: DeployService, projectRepo: ProjectRepository) {
    this.deployService = deployService;
    this.projectRepo = projectRepo;
  }

  /** Load all enabled cron jobs from the database on startup. */
  async loadAll() {
    if (!this.projectRepo) throw new Error("Scheduler not initialised");
    const projects = await this.projectRepo.findAllCronEnabled();
    for (const project of projects) {
      this.upsertJob(project);
    }
    logger.info(`Cron scheduler loaded ${projects.length} job(s)`);
  }

  /**
   * Register (or re-register) a cron job for the given project.
   * Call this after the project's cron config is saved via API.
   */
  upsertJob(project: Project) {
    // Always remove the old task first
    this.removeJob(project.id);

    if (!project.cron_enabled || !project.cron_expression) return;

    if (!cron.validate(project.cron_expression)) {
      logger.warn("Invalid cron expression — job not scheduled", {
        projectId: project.id,
        expression: project.cron_expression,
      });
      return;
    }

    const task = cron.schedule(
      project.cron_expression,
      async () => {
        logger.info("Cron deploy triggered", {
          projectId: project.id,
          name: project.name,
        });
        try {
          await this.deployService!.enqueueDeploy(project.id, project.owner_id);
        } catch (err: any) {
          logger.error("Cron deploy failed to enqueue", {
            projectId: project.id,
            err: err.message,
          });
        }
      },
      { timezone: "UTC" },
    );

    this.tasks.set(project.id, task);
    logger.info("Cron job scheduled", {
      projectId: project.id,
      expression: project.cron_expression,
    });
  }

  /** Stop and remove a project's cron task. */
  removeJob(projectId: number) {
    const existing = this.tasks.get(projectId);
    if (existing) {
      existing.stop();
      this.tasks.delete(projectId);
    }
  }

  /** Returns true if the expression is valid node-cron syntax. */
  validate(expression: string): boolean {
    return cron.validate(expression);
  }
}

export const scheduler = new CronScheduler();
