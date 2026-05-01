/**
 * src/middlewares/correlationId.js
 *
 * Assigns a unique correlation-id (UUID) to every incoming request.
 * The id is:
 *   - Set in AsyncLocalStorage so the Winston logger attaches it to every log line
 *   - Returned in the X-Correlation-Id response header so clients can trace requests
 */
import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { correlationStorage } from "../utils/correlationStorage.js";

export function correlationId(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const rawId = req.headers["x-correlation-id"];
  const id = Array.isArray(rawId) ? rawId[0] : (rawId ?? uuidv4());
  res.setHeader("X-Correlation-Id", id);

  correlationStorage.run({ correlationId: id as string }, () => {
    req.correlationId = id as string;
    next();
  });
}
