/**
 * src/config/db.js
 *
 * Opens (or creates) the SQLite database using Node's built-in `node:sqlite`
 * module (available since Node v22.5.0, no native compilation needed).
 * `DatabaseSync` is synchronous — safe in Node.js because SQLite ops are fast
 * and never block the event-loop for long.
 *
 * The db instance is a singleton — import this wherever you need
 * raw DB access (mainly in repository classes).
 */
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import { env } from "./env.js";
import logger from "./logger.js";

// Ensure the data directory exists
const dbDir = path.dirname(path.resolve(env.DB_PATH));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(path.resolve(env.DB_PATH));

// Enable WAL mode for better concurrent read performance
db.exec("PRAGMA journal_mode = WAL");
// Enforce foreign-key constraints
db.exec("PRAGMA foreign_keys = ON");

logger.info("SQLite database opened", { path: env.DB_PATH });

export default db;
