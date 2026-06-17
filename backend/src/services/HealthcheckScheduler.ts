/**
 * src/services/HealthcheckScheduler.js
 *
 * Periodically pings the `healthcheck_url` of every diagram node that has one
 * and stores the result (`up`/`down`) on the node. Runs in the main server
 * process (the app is single-instance) on a simple setInterval loop.
 *
 * Pinging from the backend (instead of the browser) avoids CORS issues when
 * checking arbitrary external services.
 */
import { DiagramNodeRepository } from "../repositories/DiagramNodeRepository.js";
import { env } from "../config/env.js";
import logger from "../config/logger.js";
import type { NodeStatus } from "../types.js";

const PING_TIMEOUT_MS = 8_000;

async function pingOnce(url: string): Promise<NodeStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
    });
    // Any non-5xx response means the service answered → consider it up
    return res.status < 500 ? "up" : "down";
  } catch {
    return "down";
  } finally {
    clearTimeout(timer);
  }
}

export class HealthcheckScheduler {
  private nodeRepo: DiagramNodeRepository;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(nodeRepo = new DiagramNodeRepository()) {
    this.nodeRepo = nodeRepo;
  }

  async runOnce(): Promise<void> {
    if (this.running) return; // avoid overlapping sweeps
    this.running = true;
    try {
      const nodes = await this.nodeRepo.findAllWithHealthcheck();
      await Promise.all(
        nodes.map(async (node) => {
          const status = await pingOnce(node.healthcheck_url as string);
          await this.nodeRepo.updateStatus(node.id, status);
        }),
      );
      if (nodes.length > 0)
        logger.debug("Healthcheck sweep done", { count: nodes.length });
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
    // Kick off after a short delay so startup isn't blocked
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
