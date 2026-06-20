/**
 * src/routes/statusRoutes.js
 *
 * Two routers:
 *  - makeStatusRouter: authenticated per-project healthcheck CRUD + config,
 *    mounted at /api (paths like /api/projects/:id/healthchecks).
 *  - makePublicStatusRouter: the public status aggregate, NO auth,
 *    mounted at /api/public-status.
 */
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";

/**
 * @param {ReturnType<import('../controllers/statusController.js').makeStatusController>} statusCtrl
 */
export function makeStatusRouter(statusCtrl) {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/projects/:id/healthchecks",
    asyncHandler(statusCtrl.listHealthchecks),
  );
  router.post(
    "/projects/:id/healthchecks",
    asyncHandler(statusCtrl.addHealthcheck),
  );
  router.put(
    "/projects/:id/healthchecks/:hcId",
    asyncHandler(statusCtrl.updateHealthcheck),
  );
  router.delete(
    "/projects/:id/healthchecks/:hcId",
    asyncHandler(statusCtrl.deleteHealthcheck),
  );

  router.get(
    "/projects/:id/status-config",
    asyncHandler(statusCtrl.getStatusConfig),
  );
  router.put(
    "/projects/:id/status-config",
    asyncHandler(statusCtrl.setStatusConfig),
  );

  return router;
}

/** Public, unauthenticated status aggregate. */
export function makePublicStatusRouter(statusCtrl) {
  const router = Router();
  router.get("/", asyncHandler(statusCtrl.getPublicStatus));
  return router;
}
