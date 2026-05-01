/**
 * src/routes/envVarRoutes.ts
 *
 * Env var routes nested inside project/repo context:
 *   GET    /api/projects/:id/repos/:repoId/env          — list (+ ?branch filter)
 *   POST   /api/projects/:id/repos/:repoId/env          — upsert
 *   PUT    /api/projects/:id/repos/:repoId/env/:envId   — update
 *   DELETE /api/projects/:id/repos/:repoId/env/:envId   — delete
 *   GET    /api/projects/:id/repos/:repoId/env/export   — download .env file (?branch)
 */
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import type { makeEnvVarController } from "../controllers/envVarController.js";

export function makeEnvVarRouter(
  envVarCtrl: ReturnType<typeof makeEnvVarController>,
) {
  const router = Router({ mergeParams: true });

  router.use(requireAuth);

  // Export and bulk must come before /:envId to avoid route collision
  router.get("/export", asyncHandler(envVarCtrl.export));
  router.post("/bulk", asyncHandler(envVarCtrl.bulkUpsert));

  router.get("/", asyncHandler(envVarCtrl.list));
  router.post("/", asyncHandler(envVarCtrl.upsert));
  router.put("/:envId", asyncHandler(envVarCtrl.update));
  router.delete("/:envId", asyncHandler(envVarCtrl.remove));

  return router;
}
