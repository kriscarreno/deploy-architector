/**
 * src/middlewares/requireAuth.js
 *
 * Protects routes that require an authenticated session.
 * Throws UnauthorizedError if the user is not logged in — the
 * central error handler converts this to a 401 JSON response.
 */
import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../utils/errors.js";

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  next(new UnauthorizedError());
}
