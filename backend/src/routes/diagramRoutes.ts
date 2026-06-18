/**
 * src/routes/diagramRoutes.js
 *
 * All /api/diagrams routes. Protected by requireAuth (session-based).
 * NOTE: the static "/import" route is declared before "/:id" so it isn't
 * captured by the id param.
 */
import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";

/**
 * @param {ReturnType<import('../controllers/diagramController.js').makeDiagramController>} diagramCtrl
 */
export function makeDiagramRouter(diagramCtrl) {
  const router = Router();

  router.use(requireAuth);

  router.get("/", asyncHandler(diagramCtrl.listDiagrams));
  router.post("/", asyncHandler(diagramCtrl.createDiagram));
  router.post("/import", asyncHandler(diagramCtrl.importDiagram));

  router.get("/:id", asyncHandler(diagramCtrl.getDiagram));
  router.put("/:id", asyncHandler(diagramCtrl.updateDiagram));
  router.delete("/:id", asyncHandler(diagramCtrl.deleteDiagram));
  router.get("/:id/export", asyncHandler(diagramCtrl.exportDiagram));
  router.patch("/:id/layout", asyncHandler(diagramCtrl.saveLayout));

  router.post("/:id/nodes", asyncHandler(diagramCtrl.addNode));
  router.put("/:id/nodes/:nodeId", asyncHandler(diagramCtrl.updateNode));
  router.delete("/:id/nodes/:nodeId", asyncHandler(diagramCtrl.deleteNode));

  router.post("/:id/edges", asyncHandler(diagramCtrl.addEdge));
  router.put("/:id/edges/:edgeId", asyncHandler(diagramCtrl.updateEdge));
  router.delete("/:id/edges/:edgeId", asyncHandler(diagramCtrl.deleteEdge));

  return router;
}
