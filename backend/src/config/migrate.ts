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

  `CREATE TABLE IF NOT EXISTS repo_env_vars (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id    INTEGER NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    branch     TEXT    NOT NULL, -- 'main' | 'production'
    key        TEXT    NOT NULL,
    value      TEXT    NOT NULL DEFAULT '',
    is_secret  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(repo_id, branch, key)
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

  // ── Teams (collaboration) ────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS teams (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS team_members (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id    INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT    NOT NULL DEFAULT 'member', -- 'owner' | 'admin' | 'member'
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(team_id, user_id)
  )`,

  // ── Architecture diagrams (3D graph) ─────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS diagrams (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id     INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    name        TEXT    NOT NULL,
    description TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS diagram_nodes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    diagram_id      INTEGER NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    kind            TEXT    NOT NULL DEFAULT 'external', -- 'project' | 'external'
    project_id      INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    label           TEXT    NOT NULL,
    service_type    TEXT,
    url             TEXT,
    healthcheck_url TEXT,
    icon            TEXT,
    color           TEXT,
    notes           TEXT,
    pos_x           REAL    NOT NULL DEFAULT 0,
    pos_y           REAL    NOT NULL DEFAULT 0,
    pos_z           REAL    NOT NULL DEFAULT 0,
    status          TEXT    NOT NULL DEFAULT 'unknown', -- 'unknown' | 'up' | 'down'
    last_checked_at TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS diagram_edges (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    diagram_id     INTEGER NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    source_node_id INTEGER NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
    target_node_id INTEGER NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
    label          TEXT,
    edge_type      TEXT,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(diagram_id, source_node_id, target_node_id)
  )`,

  // ── Per-project healthcheck endpoints (status page) ──────────────────────
  `CREATE TABLE IF NOT EXISTS project_healthchecks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            TEXT    NOT NULL,
    url             TEXT    NOT NULL, -- absolute, or relative to projects.status_base_url
    order_index     INTEGER NOT NULL DEFAULT 0,
    status          TEXT    NOT NULL DEFAULT 'unknown', -- 'unknown' | 'up' | 'down'
    status_code     INTEGER,
    latency_ms      INTEGER,
    last_checked_at TEXT,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
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

// ── Additive column migrations (run outside main transaction, ignore if exists) ──
const alterMigrations = [
  `ALTER TABLE projects ADD COLUMN cron_expression TEXT`,
  `ALTER TABLE projects ADD COLUMN cron_enabled    INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE repos    ADD COLUMN main_url              TEXT`,
  `ALTER TABLE repos    ADD COLUMN prod_url              TEXT`,
  `ALTER TABLE repos    ADD COLUMN workflow_file         TEXT NOT NULL DEFAULT 'deploy.yml'`,
  `ALTER TABLE repos    ADD COLUMN main_workflow_file    TEXT NOT NULL DEFAULT 'deploy.yml'`,
  `ALTER TABLE repos    ADD COLUMN prod_workflow_file    TEXT NOT NULL DEFAULT 'deploy.yml'`,
  `ALTER TABLE projects ADD COLUMN status_base_url       TEXT`,
  `ALTER TABLE projects ADD COLUMN status_public         INTEGER NOT NULL DEFAULT 0`,
];

for (const sql of alterMigrations) {
  try {
    db.exec(sql);
  } catch {
    // Column already exists — safe to ignore
  }
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
