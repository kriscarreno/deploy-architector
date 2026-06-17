/**
 * @file useTeams.js
 * @description Carga y gestiona la lista de equipos del usuario.
 */
import { useCallback, useEffect, useState } from "react";
import teamService from "../services/teamService";
import useToast from "./useToast";
import { getErrorMessage } from "../utils/errorHandler";
import type { Team, TeamRole } from "../types";

function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const { toastError, toastSuccess } = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setTeams(await teamService.getAll());
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTeam = async (name: string) => {
    try {
      const team = await teamService.create(name);
      setTeams((prev) => [team, ...prev]);
      toastSuccess(`Equipo "${team.name}" creado`);
      return team;
    } catch (err) {
      toastError(getErrorMessage(err));
      throw err;
    }
  };

  const deleteTeam = async (id: number) => {
    try {
      await teamService.delete(id);
      setTeams((prev) => prev.filter((t) => t.id !== id));
      toastSuccess("Equipo eliminado");
    } catch (err) {
      toastError(getErrorMessage(err));
      throw err;
    }
  };

  const addMember = async (id: number, username: string, role: TeamRole) => {
    try {
      const members = await teamService.addMember(id, username, role);
      toastSuccess(`${username} añadido al equipo`);
      return members;
    } catch (err) {
      toastError(getErrorMessage(err));
      throw err;
    }
  };

  const removeMember = async (id: number, userId: number) => {
    try {
      await teamService.removeMember(id, userId);
      toastSuccess("Miembro eliminado");
    } catch (err) {
      toastError(getErrorMessage(err));
      throw err;
    }
  };

  return {
    teams,
    loading,
    refresh,
    createTeam,
    deleteTeam,
    addMember,
    removeMember,
  };
}

export default useTeams;
