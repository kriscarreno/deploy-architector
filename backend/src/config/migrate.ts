/**
 * src/config/migrate.js
 *
 * Run as a standalone script:  node src/config/migrate.js
 *
 * Creates all tables if they don't exist. Safe to run multiple times
 * (uses CREATE TABLE IF NOT EXISTS).
 *
 * Schema overview:
 *  users            — GitHub-authenticated users
 *  projects         — top-level deployment projects (owned by a user)
 *  project_members  — RBAC: additional members per project
 *  repos            — Git repos belonging to a project (ordered)
 *  deploy_logs      — history of every deployment attempt
 */
import db from "./db.js";
import logger from "./logger.js";

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    github_id    TEXT    NOT NULL UNIQUE,
    username     TEXT    NOT NULL,
    email        TEXT,
    avatar_url   TEXT,
    access_token TEXT    NOT NULL,
    refresh_token TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    description TEXT,
    atomic      INTEGER NOT NULL DEFAULT 0, -- 0=false, 1=true
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS project_members (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    role       TEXT    NOT NULL DEFAULT 'member', -- 'member' | 'admin'
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, user_id)
  )`,

  `CREATE TABLE IF NOT EXISTS repos (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    github_url   TEXT    NOT NULL,
    name         TEXT    NOT NULL,
    order_index  INTEGER NOT NULL DEFAULT 0,
    prod_branch  TEXT    NOT NULL DEFAULT 'production',
    main_branch  TEXT    NOT NULL DEFAULT 'main',
    local_path   TEXT,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS deploy_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    job_id      TEXT    NOT NULL UNIQUE,
    status      TEXT    NOT NULL DEFAULT 'queued', -- queued|running|success|failed|conflict
    started_at  TEXT,
    finished_at TEXT,
    log         TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS repo_env_files (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id    INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    branch     TEXT    NOT NULL DEFAULT '',
    filename   TEXT    NOT NULL,
    content    TEXT    NOT NULL DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(repo_id, branch, filename)
  )`,
];

// Run all migrations in a single transaction
db.exec("BEGIN");
try {
  for (const sql of migrations) {
    db.exec(sql);
  }
  db.exec("COMMIT");
} catch (err) {
  db.exec("ROLLBACK");
  throw err;
}

logger.info("Migrations applied successfully");

// ── Safe additive schema updates (idempotent — ignore if column already exists) ─
try {
  db.exec(
    `ALTER TABLE repo_env_files ADD COLUMN branch TEXT NOT NULL DEFAULT ''`,
  );
} catch (_) {
  // Column already exists on databases created before this migration
}
