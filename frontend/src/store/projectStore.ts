/**
 * @file projectStore.js
 * @description Estado global de proyectos usando Zustand.
 */
import { create } from "zustand";
import projectService from "../services/projectService";
import type { Project, Repo } from "../types";

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  loading: boolean;
  detailLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (payload: {
    name: string;
    description?: string;
  }) => Promise<Project>;
  updateProject: (
    id: string,
    payload: { name: string; description?: string },
  ) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  addRepo: (projectId: string, payload: unknown) => Promise<void>;
  removeRepo: (projectId: string, repoId: string) => Promise<void>;
  updateRepo: (
    projectId: string,
    repoId: string,
    payload: unknown,
  ) => Promise<void>;
  clearSelectedProject: () => void;
}
const useProjectStore = create<ProjectState>((set, get) => ({
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

  updateProject: async (id: string, payload) => {
    const updated = await projectService.update(id, payload);
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === Number(id) ? { ...p, ...updated } : p,
      ),
      selectedProject:
        state.selectedProject?.id === Number(id)
          ? { ...state.selectedProject, ...updated }
          : state.selectedProject,
    }));
    return updated;
  },

  deleteProject: async (id: string) => {
    await projectService.delete(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== Number(id)),
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
          repos: state.selectedProject.repos.filter(
            (r) => r.id !== Number(repoId),
          ),
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
            r.id === Number(repoId) ? repo : r,
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
