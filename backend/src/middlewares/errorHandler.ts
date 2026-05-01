/**
 * src/middlewares/errorHandler.js
 *
 * Centralised Express error-handling middleware.
 * MUST be registered as the LAST middleware (after all routes).
 *
 * Behaviour:
 *  - AppError subclasses → structured JSON with appropriate HTTP status
 *  - Joi ValidationError (from passport or other libs) → 422
 *  - Unknown errors in production → 500 with generic message (no leaks)
 *  - Unknown errors in development → full stack trace
 */
import type { Request, Response, NextFunction } from "express";
import logger from "../config/logger.js";
import { AppError, ValidationError } from "../utils/errors.js";
import { env } from "../config/env.js";

// eslint-disable-next-line no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Operational (expected) errors
  if (err instanceof AppError) {
    logger.warn("Operational error", {
      code: err.code,
      statusCode: err.statusCode,
      message: err.message,
      ...(err instanceof ValidationError ? { details: err.details } : {}),
    });

    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err instanceof ValidationError ? { details: err.details } : {}),
      },
    });
  }

  // Programming or unexpected error — log full stack
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  const body = {
    error: {
      code: "INTERNAL_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "An unexpected error occurred"
          : err.message,
      ...(env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
    },
  };

  res.status(500).json(body);
}
