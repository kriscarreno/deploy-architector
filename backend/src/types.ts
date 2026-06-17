/**
 * src/types.ts
 *
 * Shared domain interfaces used across repositories, services and controllers.
 */

export interface User {
  id: number;
  github_id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  access_token: string;
  refresh_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  owner_id: number;
  name: string;
  description: string | null;
  /** SQLite stores booleans as 0/1 */
  atomic: number;
  created_at: string;
  updated_at: string;
}

export interface Repo {
  id: number;
  project_id: number;
  github_url: string;
  name: string;
  order_index: number;
  prod_branch: string;
  main_branch: string;
  local_path: string | null;
  created_at: string;
  updated_at: string;
}

export type DeployStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "conflict";

export interface RepoEnvFile {
  id: number;
  repo_id: number;
  branch: string;
  filename: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DeployLog {
  id: number;
  project_id: number;
  user_id: number;
  job_id: string;
  status: DeployStatus;
  started_at: string | null;
  finished_at: string | null;
  log: string | null;
  created_at: string;
}

export interface DeployLogWithUsername extends DeployLog {
  username: string;
}

export interface DeployLogWithProjectName extends DeployLog {
  project_name: string;
}

export interface Pagination {
  limit: number;
  offset: number;
}

export interface ProjectWithRepos extends Project {
  repos: Repo[];
}

// ── Teams ────────────────────────────────────────────────────────────────

export type TeamRole = "owner" | "admin" | "member";

export interface Team {
  id: number;
  owner_id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: number;
  username: string;
  avatar_url: string | null;
  role: TeamRole;
}

// ── Architecture diagrams ──────────────────────────────────────────────────

export type NodeKind = "project" | "external";
export type NodeStatus = "unknown" | "up" | "down";

export interface Diagram {
  id: number;
  owner_id: number;
  team_id: number | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiagramNode {
  id: number;
  diagram_id: number;
  kind: NodeKind;
  project_id: number | null;
  label: string;
  service_type: string | null;
  url: string | null;
  healthcheck_url: string | null;
  icon: string | null;
  color: string | null;
  notes: string | null;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  status: NodeStatus;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiagramEdge {
  id: number;
  diagram_id: number;
  source_node_id: number;
  target_node_id: number;
  label: string | null;
  edge_type: string | null;
  created_at: string;
}

export interface DiagramWithGraph extends Diagram {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}
