/**
 * @file projectStore.js
 * @description Estado global de proyectos usando Zustand.
 */
import { create } from "zustand";
import projectService from "../services/projectService";

/**
 * @typedef {Object} ProjectState
 * @property {Project[]}   projects        - Lista de proyectos
 * @property {Project|null} selectedProject - Proyecto activo en detalle
 * @property {boolean}     loading         - Cargando lista
 * @property {boolean}     detailLoading   - Cargando detalle
 * @property {string|null} error           - Error actual
 */
const useProjectStore = create((set, get) => ({
  projects: [],
  selectedProject: null,
  loading: false,
  detailLoading: false,
  error: null,

  /**
   * Carga todos los proyectos.
   */
  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await projectService.getAll();
      set({ projects, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  /**
   * Carga el detalle de un proyecto (con sus repos).
   * @param {string} id
   */
  fetchProject: async (id) => {
    set({ detailLoading: true, error: null });
    try {
      const project = await projectService.getById(id);
      set({ selectedProject: project, detailLoading: false });
    } catch (err) {
      set({ error: err.message, detailLoading: false });
    }
  },

  /**
   * Crea un proyecto y lo añade al estado.
   * @param {{ name: string, description?: string }} payload
   */
  createProject: async (payload) => {
    const project = await projectService.create(payload);
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },

  /**
   * Elimina un proyecto del estado y del backend.
   * @param {string} id
   */
  deleteProject: async (id) => {
    await projectService.delete(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    }));
  },

  /**
   * Añade un repo al proyecto seleccionado.
   * @param {string} projectId
   * @param {object} payload
   */
  addRepo: async (projectId, payload) => {
    const repo = await projectService.addRepo(projectId, payload);
    set((state) => {
      if (!state.selectedProject) return {};
      return {
        selectedProject: {
          ...state.selectedProject,
          repos: [...(state.selectedProject.repos ?? []), repo],
        },
      };
    });
    return repo;
  },

  /**
   * Elimina un repo del proyecto seleccionado.
   * @param {string} projectId
   * @param {string} repoId
   */
  removeRepo: async (projectId, repoId) => {
    await projectService.removeRepo(projectId, repoId);
    set((state) => {
      if (!state.selectedProject) return {};
      return {
        selectedProject: {
          ...state.selectedProject,
          repos: state.selectedProject.repos.filter((r) => r.id !== repoId),
        },
      };
    });
  },

  updateRepo: async (projectId, repoId, payload) => {
    const repo = await projectService.updateRepo(projectId, repoId, payload);
    set((state) => {
      if (!state.selectedProject) return {};
      return {
        selectedProject: {
          ...state.selectedProject,
          repos: state.selectedProject.repos.map((r) =>
            r.id === repoId ? repo : r,
          ),
        },
      };
    });
    return repo;
  },

  /** Limpia el proyecto seleccionado al salir de la vista de detalle. */
  clearSelectedProject: () => set({ selectedProject: null }),
}));

export default useProjectStore;
