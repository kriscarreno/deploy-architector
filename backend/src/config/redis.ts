/**
 * src/config/redis.js
 *
 * Singleton ioredis client.
 * Exported and reused by Bull queues and LockService.
 */
import { Redis } from "ioredis";
import { env } from "./env.js";
import logger from "./logger.js";

const options = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
  // Retry strategy: exponential back-off up to 30 s
  retryStrategy: (times) => Math.min(times * 200, 30_000),
  maxRetriesPerRequest: null, // Required by Bull
  enableReadyCheck: false, // Required by Bull
  lazyConnect: false,
};

const redisClient = new Redis(options);

redisClient.on("connect", () => logger.info("Redis connected"));
redisClient.on("error", (err) =>
  logger.error("Redis error", { err: err.message }),
);

export default redisClient;
