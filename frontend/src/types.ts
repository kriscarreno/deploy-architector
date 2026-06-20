/**
 * src/types.ts
 *
 * Shared domain types for the frontend.
 */

export interface User {
  id: number;
  github_id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
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
  main_url: string | null;
  prod_url: string | null;
  workflow_file: string;
  main_workflow_file: string;
  prod_workflow_file: string;
  local_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  owner_id: number;
  name: string;
  description: string | null;
  atomic: number;
  cron_expression: string | null;
  cron_enabled: number;
  status_base_url?: string | null;
  status_public?: number;
  created_at: string;
  updated_at: string;
  repos?: Repo[];
  repo_count?: number;
}

export type HealthStatus = "unknown" | "up" | "down";

export interface ProjectHealthcheck {
  id: number;
  project_id: number;
  name: string;
  url: string;
  order_index: number;
  status: HealthStatus;
  status_code: number | null;
  latency_ms: number | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicStatusCheck {
  name: string;
  status: HealthStatus;
  statusCode: number | null;
  latencyMs: number | null;
  lastCheckedAt: string | null;
}

export interface PublicStatusProject {
  projectId: number;
  projectName: string;
  checks: PublicStatusCheck[];
}

export interface RepoEnvFile {
  id: number;
  repo_id: number;
  branch: string;
  filename: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface RepoEnvFile {
  id: number;
  repo_id: number;
  branch: string;
  filename: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// ── Teams ────────────────────────────────────────────────────────────────

export type TeamRole = "owner" | "admin" | "member";

export interface TeamMember {
  id: number;
  username: string;
  avatar_url: string | null;
  role: TeamRole;
}

export interface Team {
  id: number;
  owner_id: number;
  name: string;
  created_at: string;
  updated_at: string;
  members?: TeamMember[];
}

// ── Architecture diagrams (3D graph) ────────────────────────────────────────

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

export interface DeployJob {
  id: number;
  project_id: number;
  user_id: number;
  job_id: string;
  status: "queued" | "running" | "success" | "failed" | "conflict";
  started_at: string | null;
  finished_at: string | null;
  log: string | null;
  created_at: string;
  project_name?: string;
  username?: string;
  bullState?: string | null;
  currentRepo?: string;
  logs?: string[];
  progress?: number;
}

export type EnvBranch = "main" | "production";

export interface EnvVar {
  id: number;
  repo_id: number;
  branch: EnvBranch;
  key: string;
  value: string;
  is_secret: number; // 0 | 1
  created_at: string;
  updated_at: string;
}
