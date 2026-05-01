/**
 * src/utils/errors.js
 *
 * Custom error hierarchy used across the entire application.
 *
 * AppError is the base class — every intentional operational error
 * should extend it so the central error-handler middleware can
 * distinguish them from unexpected programming errors.
 *
 * Usage:
 *   throw new NotFoundError('Project not found');
 *   throw new UnauthorizedError();
 *   throw new ConflictError('Git merge conflict on repo: api');
 */

export class AppError extends Error {
  /**
   * @param {string} message   - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code      - Machine-readable code for clients
   */
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    // Capture clean stack trace (V8)
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(message, 403, "FORBIDDEN");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409, "CONFLICT");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details = []) {
    super(message, 422, "VALIDATION_ERROR");
    this.details = details;
  }
}

export class DeployError extends AppError {
  constructor(message, details = {}) {
    super(message, 500, "DEPLOY_ERROR");
    this.details = details;
  }
}
