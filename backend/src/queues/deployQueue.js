/**
 * src/queues/deployQueue.js
 *
 * Exports the Bull queue instance used to enqueue and consume
 * deploy jobs.
 *
 * Bull requires two separate ioredis connections (one for blocking
 * commands, one for regular commands). We create them here using the
 * same Redis config rather than sharing the singleton client.
 */
import Bull from "bull";
import { env } from "../config/env.js";
import logger from "../config/logger.js";

const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const deployQueue = new Bull("deploy", { redis: redisConfig });

deployQueue.on("error", (err) =>
  logger.error("Bull queue error", { err: err.message }),
);
deployQueue.on("failed", (job, err) =>
  logger.error("Bull job failed", { jobId: job.id, err: err.message }),
);
