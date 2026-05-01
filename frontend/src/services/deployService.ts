/**
 * @file deployService.js
 * @description Servicios de despliegue: arrancar un deploy y consultar su estado.
 */
import apiClient from "./apiClient";

const deployService = {
  /**
   * Inicia el despliegue de un proyecto.
   * @param {string} projectId
   * @returns {Promise<{ jobId: string }>}
   */
  trigger(projectId) {
    return apiClient
      .post(`/api/projects/${projectId}/deploy`)
      .then((r) => r.data.data);
  },

  /**
   * Consulta el estado de un job de despliegue.
   * @param {string} jobId
   * @returns {Promise<DeployJob>}
   * DeployJob: { jobId, status: 'pending'|'running'|'success'|'failed',
   *              currentRepo: string, logs: string[], progress: number }
   */
  getJobStatus(jobId) {
    return apiClient.get(`/api/jobs/${jobId}`).then((r) => r.data.data);
  },

  /**
   * Obtiene el historial de deploys de un proyecto.
   * @param {string} projectId
   * @returns {Promise<DeployJob[]>}
   */
  getHistory(projectId) {
    return apiClient
      .get(`/api/projects/${projectId}/deploys`)
      .then((r) => r.data.data);
  },

  // Global history → GET /api/jobs (all deploy logs for the user)
  getGlobalHistory() {
    return apiClient.get("/api/jobs").then((r) => r.data.data);
  },
};

export default deployService;
