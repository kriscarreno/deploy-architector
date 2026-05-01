/**
 * src/controllers/deployController.js
 *
 * Handles HTTP request/response for deploy-related endpoints.
 * Delegates ALL business logic to DeployService.
 */
import Joi from "joi";

const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

/**
 * @param {import('../services/DeployService.js').DeployService} deployService
 */
export function makeDeployController(deployService) {
  return {
    async enqueueDeploy(req, res) {
      const result = await deployService.enqueueDeploy(
        Number(req.params.id),
        req.user.id,
      );
      res.status(202).json({ data: result });
    },

    async getJobStatus(req, res) {
      const status = await deployService.getJobStatus(
        req.params.jobId,
        req.user.id,
      );
      res.json({ data: status });
    },

    async getDeployHistory(req, res) {
      const { value: pagination } = paginationSchema.validate(req.query, {
        stripUnknown: true,
      });
      const history = await deployService.getDeployHistory(
        Number(req.params.id),
        req.user.id,
        pagination,
      );
      res.json({ data: history });
    },

    async getGlobalHistory(req, res) {
      const { value: pagination } = paginationSchema.validate(req.query, {
        stripUnknown: true,
      });
      const history = await deployService.getGlobalHistory(
        req.user.id,
        pagination,
      );
      res.json({ data: history });
    },
  };
}
