/**
 * src/middlewares/requireAuth.js
 *
 * Protects routes that require an authenticated session.
 * Throws UnauthorizedError if the user is not logged in — the
 * central error handler converts this to a 401 JSON response.
 */
import { UnauthorizedError } from "../utils/errors.js";

export function requireAuth(req, _res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  next(new UnauthorizedError());
}
