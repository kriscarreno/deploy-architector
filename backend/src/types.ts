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
