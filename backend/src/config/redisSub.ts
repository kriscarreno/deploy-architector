/**
 * src/config/redisSub.ts
 *
 * Factory for dedicated pub/sub subscriber clients.
 *
 * A Redis client in subscribe mode cannot execute other commands,
 * so we create a fresh instance per SSE connection and disconnect
 * it when the connection closes.
 */
import { Redis } from "ioredis";
import { env } from "./env.js";

export function createSubscriber(): Redis {
  return new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    ...(env.REDIS_PASSWORD ? { password: env.REDIS_PASSWORD } : {}),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

/** Redis pub/sub channel for a deploy job's real-time log stream. */
export const deployChannel = (jobId: string): string => `deploy:${jobId}`;
