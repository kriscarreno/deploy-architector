/**
 * src/server.js
 *
 * Entry point — creates the HTTP server, runs DB migrations,
 * and starts listening.
 *
 * Keeping this file minimal makes the app easier to test
 * (import app.js directly without starting a server).
 */

// Run migrations before anything else
import "./config/migrate.js";

import http from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import logger from "./config/logger.js";
import { HealthcheckScheduler } from "./services/HealthcheckScheduler.js";

const server = http.createServer(app);

// Background pings to diagram nodes' healthcheck URLs
const healthcheckScheduler = new HealthcheckScheduler();

server.listen(env.PORT, () => {
  logger.info(`Server listening`, { port: env.PORT, env: env.NODE_ENV });
  healthcheckScheduler.start();
});

// ── Graceful shutdown ─────────────────────────────────────────────────────
async function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);

  healthcheckScheduler.stop();

  server.close((err) => {
    if (err) {
      logger.error("Error during server close", { err: err.message });
      process.exit(1);
    }
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force exit if connections linger more than 10 s
  setTimeout(() => {
    logger.warn("Forcing exit after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { err: err.message, stack: err.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason: String(reason) });
  process.exit(1);
});
