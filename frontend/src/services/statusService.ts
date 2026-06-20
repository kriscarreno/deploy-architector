/**
 * @file statusService.js
 * @description Healthchecks por proyecto, configuración de estado y el
 * agregado público para la página de status.
 */
import apiClient from "./apiClient";
import type {
  Project,
  ProjectHealthcheck,
  PublicStatusProject,
} from "../types";

const statusService = {
  listHealthchecks(projectId: number | string): Promise<ProjectHealthcheck[]> {
    return apiClient
      .get(`/api/projects/${projectId}/healthchecks`)
      .then((r) => r.data.data);
  },

  addHealthcheck(
    projectId: number | string,
    payload: { name: string; url: string; orderIndex?: number },
  ): Promise<ProjectHealthcheck> {
    return apiClient
      .post(`/api/projects/${projectId}/healthchecks`, payload)
      .then((r) => r.data.data);
  },

  updateHealthcheck(
    projectId: number | string,
    hcId: number,
    payload: { name?: string; url?: string; orderIndex?: number },
  ): Promise<ProjectHealthcheck> {
    return apiClient
      .put(`/api/projects/${projectId}/healthchecks/${hcId}`, payload)
      .then((r) => r.data.data);
  },

  deleteHealthcheck(projectId: number | string, hcId: number): Promise<void> {
    return apiClient
      .delete(`/api/projects/${projectId}/healthchecks/${hcId}`)
      .then(() => undefined);
  },

  getConfig(
    projectId: number | string,
  ): Promise<{ status_base_url: string | null; status_public: number }> {
    return apiClient
      .get(`/api/projects/${projectId}/status-config`)
      .then((r) => r.data.data);
  },

  setConfig(
    projectId: number | string,
    payload: { statusBaseUrl?: string | null; statusPublic?: boolean },
  ): Promise<Project> {
    return apiClient
      .put(`/api/projects/${projectId}/status-config`, payload)
      .then((r) => r.data.data);
  },

  /** Public — no auth required. */
  getPublicStatus(): Promise<PublicStatusProject[]> {
    return apiClient.get("/api/public-status").then((r) => r.data.data);
  },
};

export default statusService;
