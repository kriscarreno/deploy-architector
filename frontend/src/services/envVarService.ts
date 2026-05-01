/**
 * @file envVarService.ts
 * @description CRUD de variables de entorno por repositorio y rama.
 */
import apiClient from "./apiClient";
import type { EnvVar, EnvBranch } from "../types";

const envVarService = {
  /**
   * Lista variables de entorno de un repo, opcionalmente filtradas por rama.
   */
  getAll(
    projectId: number | string,
    repoId: number | string,
    branch?: EnvBranch,
  ): Promise<EnvVar[]> {
    const params = branch ? `?branch=${branch}` : "";
    return apiClient
      .get(`/api/projects/${projectId}/repos/${repoId}/env${params}`)
      .then((r) => r.data.data);
  },

  /**
   * Crea o actualiza una variable (upsert por key+branch).
   */
  upsert(
    projectId: number | string,
    repoId: number | string,
    payload: {
      branch: EnvBranch;
      key: string;
      value: string;
      is_secret: boolean;
    },
  ): Promise<EnvVar> {
    return apiClient
      .post(`/api/projects/${projectId}/repos/${repoId}/env`, payload)
      .then((r) => r.data.data);
  },

  /**
   * Actualiza value y/o is_secret de una variable existente.
   */
  update(
    projectId: number | string,
    repoId: number | string,
    envId: number,
    payload: { value?: string; is_secret?: boolean },
  ): Promise<EnvVar> {
    return apiClient
      .put(`/api/projects/${projectId}/repos/${repoId}/env/${envId}`, payload)
      .then((r) => r.data.data);
  },

  /**
   * Elimina una variable por id.
   */
  remove(
    projectId: number | string,
    repoId: number | string,
    envId: number,
  ): Promise<void> {
    return apiClient
      .delete(`/api/projects/${projectId}/repos/${repoId}/env/${envId}`)
      .then(() => undefined);
  },

  /**
   * Descarga un archivo .env para la rama indicada.
   */
  exportUrl(
    projectId: number | string,
    repoId: number | string,
    branch: EnvBranch,
  ): string {
    return `/api/projects/${projectId}/repos/${repoId}/env/export?branch=${branch}`;
  },

  /**
   * Importa masivamente variables desde un array parseado de un .env pegado.
   */
  bulkUpsert(
    projectId: number | string,
    repoId: number | string,
    branch: EnvBranch,
    vars: Array<{ key: string; value: string; is_secret: boolean }>,
  ): Promise<{ imported: number }> {
    return apiClient
      .post(`/api/projects/${projectId}/repos/${repoId}/env/bulk`, {
        branch,
        vars,
      })
      .then((r) => r.data.data);
  },
};

export default envVarService;
