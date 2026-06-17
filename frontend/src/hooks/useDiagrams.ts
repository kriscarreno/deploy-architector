/**
 * @file useDiagrams.js
 * @description Carga y gestiona la lista de diagramas de arquitectura.
 */
import { useCallback, useEffect, useState } from "react";
import diagramService from "../services/diagramService";
import useToast from "./useToast";
import { getErrorMessage } from "../utils/errorHandler";
import type { Diagram } from "../types";

function useDiagrams() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [loading, setLoading] = useState(true);
  const { toastError, toastSuccess } = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setDiagrams(await diagramService.getAll());
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createDiagram = async (payload: {
    name: string;
    description?: string | null;
    teamId?: number | null;
  }) => {
    try {
      const diagram = await diagramService.create(payload);
      setDiagrams((prev) => [diagram, ...prev]);
      toastSuccess(`Diagrama "${diagram.name}" creado`);
      return diagram;
    } catch (err) {
      toastError(getErrorMessage(err));
      throw err;
    }
  };

  const deleteDiagram = async (id: number) => {
    try {
      await diagramService.delete(id);
      setDiagrams((prev) => prev.filter((d) => d.id !== id));
      toastSuccess("Diagrama eliminado");
    } catch (err) {
      toastError(getErrorMessage(err));
      throw err;
    }
  };

  const importDiagram = async (
    payload: Record<string, unknown> & { teamId?: number | null },
  ) => {
    try {
      const diagram = await diagramService.import(payload);
      setDiagrams((prev) => [diagram, ...prev]);
      toastSuccess(`Diagrama "${diagram.name}" importado`);
      return diagram;
    } catch (err) {
      toastError(getErrorMessage(err));
      throw err;
    }
  };

  return {
    diagrams,
    loading,
    refresh,
    createDiagram,
    deleteDiagram,
    importDiagram,
  };
}

export default useDiagrams;
