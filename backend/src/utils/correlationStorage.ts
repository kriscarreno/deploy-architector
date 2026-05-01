/**
 * src/utils/correlationStorage.js
 *
 * AsyncLocalStorage instance used to propagate a correlation-id
 * (request-id) through the entire async call chain without passing
 * it explicitly as a parameter.
 *
 * The middleware/correlationId.js sets the store at request time;
 * the logger reads it automatically on every log call.
 */
import { AsyncLocalStorage } from "async_hooks";

interface CorrelationStore {
  correlationId: string;
}

export const correlationStorage = new AsyncLocalStorage<CorrelationStore>();
