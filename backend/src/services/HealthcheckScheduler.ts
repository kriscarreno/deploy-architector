/**
 * src/services/HealthcheckScheduler.js
 *
 * Periodically pings:
 *  - every diagram node that has a `healthcheck_url`, and
 *  - every per-project healthcheck endpoint (status page),
 * storing the result (up/down, + status code & latency for project checks).
 *
 * Runs in the main server process (single-instance app) on a setInterval loop.
 * Pinging from the backend (not the browser) avoids CORS against external URLs.
 */
import { DiagramNodeRepository } from "../repositories/DiagramNodeRepository.js";
import { ProjectHealthcheckRepository } from "../repositories/ProjectHealthcheckRepository.js";
import { env } from "../config/env.js";
import logger from "../config/logger.js";
import type { HealthStatus, NodeStatus } from "../types.js";

const PING_TIMEOUT_MS = 8_000;

interface PingResult {
  status: HealthStatus;
  statusCode: number | null;
  latencyMs: number | null;
}

async function pingDetailed(url: string): Promise<PingResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
    });
    const latencyMs = Date.now() - start;
    // Any non-5xx response means the service answered → consider it up
    return {
      status: res.status < 500 ? "up" : "down",
      statusCode: res.status,
      latencyMs,
    };
  } catch {
    return { status: "down", statusCode: null, latencyMs: Date.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

/** Join a project base URL with a (possibly relative) healthcheck URL. */
export function resolveHealthcheckUrl(
  baseUrl: string | null | undefined,
  url: string,
): string {
  if (/^https?:\/\//i.test(url)) return url; // absolute, ignore base
  if (!baseUrl) return url;
  return `${baseUrl.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}

export class HealthcheckScheduler {
  private nodeRepo: DiagramNodeRepository;
  private hcRepo: ProjectHealthcheckRepository;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    nodeRepo = new DiagramNodeRepository(),
    hcRepo = new ProjectHealthcheckRepository(),
  ) {
    this.nodeRepo = nodeRepo;
    this.hcRepo = hcRepo;
  }

  async runOnce(): Promise<void> {
    if (this.running) return; // avoid overlapping sweeps
    this.running = true;
    try {
      // Diagram nodes
      const nodes = await this.nodeRepo.findAllWithHealthcheck();
      await Promise.all(
        nodes.map(async (node) => {
          const { status } = await pingDetailed(node.healthcheck_url as string);
          await this.nodeRepo.updateStatus(node.id, status as NodeStatus);
        }),
      );

      // Per-project healthchecks
      const checks = await this.hcRepo.findAllWithProject();
      await Promise.all(
        checks.map(async (hc) => {
          const url = resolveHealthcheckUrl(hc.status_base_url, hc.url);
          const { status, statusCode, latencyMs } = await pingDetailed(url);
          await this.hcRepo.updateStatus(hc.id, status, statusCode, latencyMs);
        }),
      );

      const total = nodes.length + checks.length;
      if (total > 0) logger.debug("Healthcheck sweep done", { count: total });
    } catch (err) {
      logger.warn("Healthcheck sweep failed", {
        err: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.running = false;
    }
  }

  start(): void {
    if (this.timer) return;
    const interval = env.HEALTHCHECK_INTERVAL_MS;
    this.timer = setInterval(() => void this.runOnce(), interval);
    if (typeof this.timer.unref === "function") this.timer.unref();
    logger.info("Healthcheck scheduler started", { interval });
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
