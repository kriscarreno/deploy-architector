/**
 * src/routes/projectRoutes.js
 *
 * All /api/projects routes.
 * Protected by the requireAuth middleware (session-based).
 *
 * Routes:
 *   GET    /api/projects
 *   POST   /api/projects
 *   GET    /api/projects/:id/repos
 *   POST   /api/projects/:id/repos
 *   POST   /api/projects/:id/deploy
 *   GET    /api/projects/:id/deploys
 */
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";

/**
 * @param {import('../controllers/projectController.js').makeProjectController} projectCtrl
 * @param {import('../controllers/deployController.js').makeDeployController}   deployCtrl
 */
export function makeProjectRouter(projectCtrl, deployCtrl) {
  const router = Router();

  // All project routes require authentication
  router.use(requireAuth);

  router.get("/", asyncHandler(projectCtrl.listProjects));
  router.post("/", asyncHandler(projectCtrl.createProject));

  router.get("/:id", asyncHandler(projectCtrl.getProject));
  router.put("/:id", asyncHandler(projectCtrl.updateProject));
  router.delete("/:id", asyncHandler(projectCtrl.deleteProject));

  router.get("/:id/repos", asyncHandler(projectCtrl.listRepos));
  router.post("/:id/repos", asyncHandler(projectCtrl.addRepo));
  router.put("/:id/repos/:repoId", asyncHandler(projectCtrl.updateRepo));
  router.delete("/:id/repos/:repoId", asyncHandler(projectCtrl.deleteRepo));

  router.get("/:id/diff", asyncHandler(projectCtrl.getProjectDiff));
  router.get("/:id/status", asyncHandler(projectCtrl.getProjectStatus));
  router.put("/:id/cron", asyncHandler(projectCtrl.updateCronConfig));
  router.post("/:id/deploy", asyncHandler(deployCtrl.enqueueDeploy));
  router.get("/:id/deploys", asyncHandler(deployCtrl.getDeployHistory));

  return router;
}
