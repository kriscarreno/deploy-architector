/**
 * src/services/TeamService.js
 *
 * Business-logic layer for teams and their members.
 * Enforces RBAC (owner/admin can manage members) and throws
 * domain-specific errors the controller maps to HTTP responses.
 */
import type { TeamRepository } from "../repositories/TeamRepository.js";
import type { UserRepository } from "../repositories/UserRepository.js";
import type { Team, TeamMember, TeamRole } from "../types.js";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../utils/errors.js";

export class TeamService {
  private teamRepo: TeamRepository;
  private userRepo: UserRepository;

  constructor(teamRepo: TeamRepository, userRepo: UserRepository) {
    this.teamRepo = teamRepo;
    this.userRepo = userRepo;
  }

  async listTeams(userId: number): Promise<Team[]> {
    return this.teamRepo.findAllByUser(userId);
  }

  async createTeam(userId: number, name: string): Promise<Team | null> {
    return this.teamRepo.create(userId, name);
  }

  /** Ensures the user is a member, returning the team or throwing. */
  private async getAccessibleTeam(
    teamId: number,
    userId: number,
  ): Promise<Team> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) throw new NotFoundError("Team not found");
    if (!(await this.teamRepo.isMember(teamId, userId)))
      throw new ForbiddenError();
    return team;
  }

  async getTeam(
    teamId: number,
    userId: number,
  ): Promise<Team & { members: TeamMember[] }> {
    const team = await this.getAccessibleTeam(teamId, userId);
    const members = await this.teamRepo.listMembers(teamId);
    return { ...team, members };
  }

  async updateTeam(
    teamId: number,
    userId: number,
    name: string,
  ): Promise<Team | null> {
    await this.getAccessibleTeam(teamId, userId);
    if (!(await this.teamRepo.isAdmin(teamId, userId)))
      throw new ForbiddenError("Only owners/admins can rename a team");
    return this.teamRepo.update(teamId, name);
  }

  async deleteTeam(teamId: number, userId: number): Promise<void> {
    const team = await this.teamRepo.findById(teamId);
    if (!team) throw new NotFoundError("Team not found");
    if (team.owner_id !== userId)
      throw new ForbiddenError("Only the owner can delete a team");
    return this.teamRepo.delete(teamId);
  }

  async listMembers(teamId: number, userId: number): Promise<TeamMember[]> {
    await this.getAccessibleTeam(teamId, userId);
    return this.teamRepo.listMembers(teamId);
  }

  /** Invite a user by GitHub username (must have logged in at least once). */
  async addMember(
    teamId: number,
    userId: number,
    username: string,
    role: TeamRole = "member",
  ): Promise<TeamMember[]> {
    await this.getAccessibleTeam(teamId, userId);
    if (!(await this.teamRepo.isAdmin(teamId, userId)))
      throw new ForbiddenError("Only owners/admins can add members");

    const target = await this.userRepo.findByUsername(username);
    if (!target)
      throw new ValidationError("User not found", [
        `No user "${username}" has signed in to this app yet`,
      ]);

    await this.teamRepo.addMember(
      teamId,
      target.id,
      role === "owner" ? "admin" : role, // never grant a second 'owner'
    );
    return this.teamRepo.listMembers(teamId);
  }

  async removeMember(
    teamId: number,
    userId: number,
    targetUserId: number,
  ): Promise<void> {
    const team = await this.getAccessibleTeam(teamId, userId);
    // Members can remove themselves; otherwise owner/admin required
    if (targetUserId !== userId) {
      if (!(await this.teamRepo.isAdmin(teamId, userId)))
        throw new ForbiddenError("Only owners/admins can remove members");
    }
    if (targetUserId === team.owner_id)
      throw new ForbiddenError("The team owner cannot be removed");
    return this.teamRepo.removeMember(teamId, targetUserId);
  }
}
