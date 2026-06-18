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
    if (!(await this.teamRepo.isOwner(teamId, userId)))
      throw new ForbiddenError("Only an owner can delete a team");
    return this.teamRepo.delete(teamId);
  }

  /** Promote/demote a member's role. Only owners may do this. */
  async updateMemberRole(
    teamId: number,
    userId: number,
    targetUserId: number,
    role: TeamRole,
  ): Promise<TeamMember[]> {
    await this.getAccessibleTeam(teamId, userId);
    if (!(await this.teamRepo.isOwner(teamId, userId)))
      throw new ForbiddenError("Only owners can change member roles");
    if (!["owner", "admin", "member"].includes(role))
      throw new ValidationError("Invalid role");

    const members = await this.teamRepo.listMembers(teamId);
    const target = members.find((m) => m.id === targetUserId);
    if (!target) throw new NotFoundError("Member not found");

    // Never leave the team without an owner
    if (target.role === "owner" && role !== "owner") {
      const owners = members.filter((m) => m.role === "owner").length;
      if (owners <= 1)
        throw new ForbiddenError("The team must keep at least one owner");
    }

    await this.teamRepo.updateMemberRole(teamId, targetUserId, role);
    return this.teamRepo.listMembers(teamId);
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
    await this.getAccessibleTeam(teamId, userId);
    const members = await this.teamRepo.listMembers(teamId);
    const target = members.find((m) => m.id === targetUserId);
    if (!target) throw new NotFoundError("Member not found");

    // Members can remove themselves; otherwise owner/admin required
    const selfRemoval = targetUserId === userId;
    if (!selfRemoval && !(await this.teamRepo.isAdmin(teamId, userId)))
      throw new ForbiddenError("Only owners/admins can remove members");

    // Removing an owner requires owner rights and can't empty the owner set
    if (target.role === "owner") {
      if (!(await this.teamRepo.isOwner(teamId, userId)))
        throw new ForbiddenError("Only owners can remove an owner");
      const owners = members.filter((m) => m.role === "owner").length;
      if (owners <= 1)
        throw new ForbiddenError("The team must keep at least one owner");
    }

    return this.teamRepo.removeMember(teamId, targetUserId);
  }
}
