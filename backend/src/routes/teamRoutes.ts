/**
 * src/routes/teamRoutes.js
 *
 * All /api/teams routes. Protected by requireAuth (session-based).
 */
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";

/**
 * @param {ReturnType<import('../controllers/teamController.js').makeTeamController>} teamCtrl
 */
export function makeTeamRouter(teamCtrl) {
  const router = Router();

  router.use(requireAuth);

  router.get("/", asyncHandler(teamCtrl.listTeams));
  router.post("/", asyncHandler(teamCtrl.createTeam));

  router.get("/:id", asyncHandler(teamCtrl.getTeam));
  router.put("/:id", asyncHandler(teamCtrl.updateTeam));
  router.delete("/:id", asyncHandler(teamCtrl.deleteTeam));

  router.get("/:id/members", asyncHandler(teamCtrl.listMembers));
  router.post("/:id/members", asyncHandler(teamCtrl.addMember));
  router.put("/:id/members/:userId", asyncHandler(teamCtrl.updateMemberRole));
  router.delete("/:id/members/:userId", asyncHandler(teamCtrl.removeMember));

  return router;
}
