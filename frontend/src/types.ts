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
  created_at: string;
  updated_at: string;
  repos?: Repo[];
  repo_count?: number;
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
