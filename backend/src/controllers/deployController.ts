/**
 * src/controllers/deployController.js
 *
 * Handles HTTP request/response for deploy-related endpoints.
 * Delegates ALL business logic to DeployService.
 */
import Joi from "joi";
import { createSubscriber, deployChannel } from "../config/redisSub.js";

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

    async dispatchWorkflow(req, res) {
      const { branch } = req.body;
      if (!branch || typeof branch !== "string" || !branch.trim()) {
        return res.status(400).json({ error: "branch is required" });
      }
      const results = await deployService.dispatchWorkflow(
        Number(req.params.id),
        req.user.id,
        branch.trim(),
      );
      res.json({ data: results });
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

    /**
     * GET /api/jobs/:jobId/stream
     * Server-Sent Events endpoint — streams deploy log lines in real time.
     * Not wrapped in asyncHandler: manages the connection lifetime itself.
     */
    streamJobLogs(req, res) {
      const { jobId } = req.params;
      const userId = req.user.id;
      const FINAL = new Set(["success", "failed", "conflict"]);

      // Auth check before opening the SSE connection
      deployService
        .getJobStatus(jobId, userId)
        .then((logEntry) => {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          // Disable nginx/CapRover proxy buffering so lines arrive immediately
          res.setHeader("X-Accel-Buffering", "no");
          res.flushHeaders();

          const send = (payload: object) => {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify(payload)}\n\n`);
            }
          };

          // If already finished, replay stored log and close
          if (FINAL.has(logEntry.status)) {
            if (logEntry.log) {
              for (const line of String(logEntry.log)
                .split("\n")
                .filter(Boolean)) {
                send({ type: "log", line });
              }
            }
            send({ type: "done", status: logEntry.status });
            res.end();
            return;
          }

          // Job still running — subscribe to Redis pub/sub channel
          const sub = createSubscriber();
          const channel = deployChannel(jobId);

          sub.subscribe(channel, (err) => {
            if (err) {
              send({ type: "error", message: "Log stream unavailable" });
              res.end();
              sub.disconnect();
            }
          });

          sub.on("message", (_ch: string, message: string) => {
            try {
              if (!res.writableEnded) res.write(`data: ${message}\n\n`);
              const parsed = JSON.parse(message) as { type: string };
              if (parsed.type === "done") {
                sub.disconnect();
                if (!res.writableEnded) res.end();
              }
            } catch (_) {}
          });

          // Clean up when client disconnects
          req.on("close", () => sub.disconnect());
        })
        .catch((err: { statusCode?: number; message: string }) => {
          if (!res.headersSent) {
            res
              .status(err.statusCode ?? 500)
              .json({ error: { message: err.message } });
          }
        });
    },
  };
}
