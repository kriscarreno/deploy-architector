/**
 * @file projectService.js
 * @description CRUD de proyectos y sus repositorios.
 */
import apiClient from "./apiClient";

const projectService = {
  /**
   * Lista todos los proyectos del usuario autenticado.
   * @returns {Promise<Project[]>}
   */
  getAll() {
    return apiClient.get("/api/projects").then((r) => r.data.data);
  },

  /**
   * Obtiene un proyecto por ID (incluye repos).
   * @param {string} id
   * @returns {Promise<Project>}
   */
  getById(id) {
    return apiClient.get(`/api/projects/${id}`).then((r) => r.data.data);
  },

  /**
   * Crea un nuevo proyecto.
   * @param {{ name: string, description?: string }} payload
   * @returns {Promise<Project>}
   */
  create(payload) {
    return apiClient.post("/api/projects", payload).then((r) => r.data.data);
  },

  /**
   * Actualiza un proyecto existente.
   * @param {string} id
   * @param {Partial<Project>} payload
   * @returns {Promise<Project>}
   */
  update(id, payload) {
    return apiClient
      .put(`/api/projects/${id}`, payload)
      .then((r) => r.data.data);
  },

  /**
   * Elimina un proyecto.
   * @param {string} id
   * @returns {Promise<void>}
   */
  delete(id) {
    return apiClient.delete(`/api/projects/${id}`);
  },

  // ── Repositorios ─────────────────────────────────────────────────────────

  /**
   * Añade un repositorio a un proyecto.
   * @param {string} projectId
   * @param {{ git_url: string, main_branch: string, production_branch: string, order: number }} payload
   * @returns {Promise<Repo>}
   */
  addRepo(projectId, payload) {
    return apiClient
      .post(`/api/projects/${projectId}/repos`, payload)
      .then((r) => r.data.data);
  },

  /**
   * Elimina un repositorio de un proyecto.
   * @param {string} projectId
   * @param {string} repoId
   * @returns {Promise<void>}
   */
  removeRepo(projectId, repoId) {
    return apiClient.delete(`/api/projects/${projectId}/repos/${repoId}`);
  },

  updateRepo(projectId, repoId, payload) {
    return apiClient
      .put(`/api/projects/${projectId}/repos/${repoId}`, payload)
      .then((r) => r.data.data);
  },

  /**
   * Obtiene el diff summary (commits pendientes) de cada repo del proyecto.
   * Hace clone/fetch en el servidor, puede tardar unos segundos.
   * @param {string|number} projectId
   */
  getDiff(projectId) {
    return apiClient.get(`/api/projects/${projectId}/diff`).then(
      (r) =>
        r.data.data as Array<{
          repoId: number;
          name: string;
          diff: string;
          upToDate: boolean;
        }>,
    );
  },

  /**
   * Guarda la configuración de despliegue programado del proyecto.
   */
  updateCron(
    projectId: number | string,
    payload: { cron_expression: string | null; cron_enabled: boolean },
  ) {
    return apiClient
      .put(`/api/projects/${projectId}/cron`, payload)
      .then((r) => r.data.data);
  },

  /**
   * Obtiene el estado (ping) de todas las URLs de despliegue del proyecto.
   */
  getStatus(projectId: number | string) {
    return apiClient.get(`/api/projects/${projectId}/status`).then(
      (r) =>
        r.data.data as Array<{
          repoId: number;
          name: string;
          main: {
            url: string | null;
            up: boolean | null;
            latencyMs: number | null;
            statusCode: number | null;
          };
          prod: {
            url: string | null;
            up: boolean | null;
            latencyMs: number | null;
            statusCode: number | null;
          };
        }>,
    );
  },
};

export default projectService;
