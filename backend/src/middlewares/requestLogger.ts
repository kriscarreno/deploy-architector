/**
 * src/middlewares/requestLogger.js
 *
 * Logs every incoming HTTP request and its response code/duration.
 * Uses the http log level so it can be suppressed in tests.
 */
import type { Request, Response, NextFunction } from "express";
import logger from "../config/logger.js";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();

  res.on("finish", () => {
    logger.http("HTTP", {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
    });
  });

  next();
}
