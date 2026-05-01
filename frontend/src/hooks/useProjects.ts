/**
 * @file useProjects.js
 * @description Hook de conveniencia sobre projectStore.
 */
import { useEffect } from "react";
import useProjectStore from "../store/projectStore";
import useToast from "./useToast";
import { getErrorMessage } from "../utils/errorHandler";

/**
 * Carga y expone la lista de proyectos con acciones CRUD.
 */
function useProjects() {
  const {
    projects,
    loading,
    error,
    fetchProjects,
    createProject: storeCreate,
    updateProject: storeUpdate,
    deleteProject: storeDelete,
  } = useProjectStore();
  const { toastError, toastSuccess } = useToast();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (error) toastError(error);
  }, [error, toastError]);

  const createProject = async (payload) => {
    try {
      const project = await storeCreate(payload);
      toastSuccess(`Proyecto "${project.name}" creado`);
      return project;
    } catch (err) {
      toastError(getErrorMessage(err));
      throw err;
    }
  };

  const updateProject = async (
    id: string,
    payload: { name: string; description?: string },
  ) => {
    try {
      const project = await storeUpdate(id, payload);
      toastSuccess(`Proyecto "${project.name}" actualizado`);
      return project;
    } catch (err) {
      toastError(getErrorMessage(err));
      throw err;
    }
  };

  const deleteProject = async (id) => {
    try {
      await storeDelete(id);
      toastSuccess("Proyecto eliminado");
    } catch (err) {
      toastError(getErrorMessage(err));
      throw err;
    }
  };

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    refresh: fetchProjects,
  };
}

export default useProjects;
