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
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
