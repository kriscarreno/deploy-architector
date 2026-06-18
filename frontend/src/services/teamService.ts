/**
 * @file teamService.js
 * @description CRUD de equipos y sus miembros.
 */
import apiClient from "./apiClient";
import type { Team, TeamMember, TeamRole } from "../types";

const teamService = {
  getAll(): Promise<Team[]> {
    return apiClient.get("/api/teams").then((r) => r.data.data);
  },

  getById(id: number | string): Promise<Team> {
    return apiClient.get(`/api/teams/${id}`).then((r) => r.data.data);
  },

  create(name: string): Promise<Team> {
    return apiClient.post("/api/teams", { name }).then((r) => r.data.data);
  },

  update(id: number | string, name: string): Promise<Team> {
    return apiClient.put(`/api/teams/${id}`, { name }).then((r) => r.data.data);
  },

  delete(id: number | string): Promise<void> {
    return apiClient.delete(`/api/teams/${id}`).then(() => undefined);
  },

  addMember(
    id: number | string,
    username: string,
    role: TeamRole = "member",
  ): Promise<TeamMember[]> {
    return apiClient
      .post(`/api/teams/${id}/members`, { username, role })
      .then((r) => r.data.data);
  },

  updateMemberRole(
    id: number | string,
    userId: number,
    role: TeamRole,
  ): Promise<TeamMember[]> {
    return apiClient
      .put(`/api/teams/${id}/members/${userId}`, { role })
      .then((r) => r.data.data);
  },

  removeMember(id: number | string, userId: number): Promise<void> {
    return apiClient
      .delete(`/api/teams/${id}/members/${userId}`)
      .then(() => undefined);
  },
};

export default teamService;
