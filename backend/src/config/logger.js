/**
 * src/config/logger.js
 *
 * Structured JSON logger powered by Winston.
 * Every log line includes:
 *   - timestamp (ISO)
 *   - level
 *   - message
 *   - correlationId  (injected per-request via AsyncLocalStorage in middleware)
 *   - ...any extra metadata passed at the call site
 *
 * Usage:
 *   import logger from '../config/logger.js';
 *   logger.info('Server started', { port: 3000 });
 *   logger.error('Unhandled error', { err: error.message });
 */
import { createLogger, format, transports, addColors } from "winston";
import { env } from "./env.js";
import { correlationStorage } from "../utils/correlationStorage.js";

// Extend the default npm levels to include `http`
const customLevels = {
  levels: { error: 0, warn: 1, info: 2, http: 3, debug: 4 },
  colors: {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "cyan",
  },
};
addColors(customLevels.colors);

const { combine, timestamp, errors, printf, colorize, json } = format;

/** Human-readable format for development */
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const cid = correlationId ? ` [${correlationId}]` : "";
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} ${level}${cid}: ${message}${extra}`;
  }),
);

/** JSON format for production — easy ingestion by log aggregators */
const prodFormat = combine(timestamp(), errors({ stack: true }), json());

/**
 * Custom format that reads the correlationId from AsyncLocalStorage
 * and attaches it to every log entry automatically.
 */
const withCorrelationId = format((info) => {
  const store = correlationStorage.getStore();
  if (store?.correlationId) {
    info.correlationId = store.correlationId;
  }
  return info;
});

const logger = createLogger({
  levels: customLevels.levels,
  level: env.LOG_LEVEL,
  format: combine(
    withCorrelationId(),
    env.NODE_ENV === "production" ? prodFormat : devFormat,
  ),
  transports: [
    new transports.Console(),
    // In production you might add a File or HTTP transport here
  ],
  // Prevent Winston from crashing on unhandled rejections
  exitOnError: false,
});

export default logger;
