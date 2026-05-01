/**
 * src/middlewares/correlationId.js
 *
 * Assigns a unique correlation-id (UUID) to every incoming request.
 * The id is:
 *   - Set in AsyncLocalStorage so the Winston logger attaches it to every log line
 *   - Returned in the X-Correlation-Id response header so clients can trace requests
 */
import { v4 as uuidv4 } from "uuid";
import { correlationStorage } from "../utils/correlationStorage.js";

export function correlationId(req, res, next) {
  const id = req.headers["x-correlation-id"] ?? uuidv4();
  res.setHeader("X-Correlation-Id", id);

  correlationStorage.run({ correlationId: id }, () => {
    req.correlationId = id;
    next();
  });
}
