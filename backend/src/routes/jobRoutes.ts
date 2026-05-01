/**
 * src/routes/jobRoutes.js
 *
 * Routes:
 *   GET /api/jobs/:jobId — poll deploy job status
 */
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";

export function makeJobRouter(deployCtrl) {
  const router = Router();

  router.use(requireAuth);
  router.get("/", asyncHandler(deployCtrl.getGlobalHistory));
  router.get("/:jobId", asyncHandler(deployCtrl.getJobStatus));
  // SSE — no asyncHandler, the handler manages the connection lifetime itself
  router.get("/:jobId/stream", (req, res) =>
    deployCtrl.streamJobLogs(req, res),
  );

  return router;
}
