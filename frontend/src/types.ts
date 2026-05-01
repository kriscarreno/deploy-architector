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
  created_at: string;
  updated_at: string;
  repos?: Repo[];
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
