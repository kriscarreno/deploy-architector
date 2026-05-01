/**
 * src/middlewares/asyncHandler.js
 *
 * Wraps an async route handler so that any rejected Promise is
 * forwarded to Express's next(err) — eliminates the try/catch
 * boilerplate in every controller method.
 *
 * Usage:
 *   router.get('/foo', asyncHandler(ctrl.foo));
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
