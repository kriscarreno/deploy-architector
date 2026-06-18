/**
 * src/controllers/teamController.js
 *
 * HTTP layer for team endpoints. Delegates all logic to TeamService.
 * Input validated with Joi; responses use the { data } envelope.
 */
import Joi from "joi";
import { ValidationError } from "../utils/errors.js";

const createTeamSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
});

const updateTeamSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
});

const addMemberSchema = Joi.object({
  username: Joi.string().trim().min(1).max(100).required(),
  role: Joi.string().valid("admin", "member").default("member"),
});

const updateRoleSchema = Joi.object({
  role: Joi.string().valid("owner", "admin", "member").required(),
});

function validate(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error)
    throw new ValidationError(
      "Validation failed",
      error.details.map((d) => d.message),
    );
  return value;
}

/**
 * @param {import('../services/TeamService.js').TeamService} teamService
 */
export function makeTeamController(teamService) {
  return {
    async listTeams(req, res) {
      const teams = await teamService.listTeams(req.user.id);
      res.json({ data: teams });
    },

    async createTeam(req, res) {
      const { name } = validate(createTeamSchema, req.body);
      const team = await teamService.createTeam(req.user.id, name);
      res.status(201).json({ data: team });
    },

    async getTeam(req, res) {
      const team = await teamService.getTeam(
        Number(req.params.id),
        req.user.id,
      );
      res.json({ data: team });
    },

    async updateTeam(req, res) {
      const { name } = validate(updateTeamSchema, req.body);
      const team = await teamService.updateTeam(
        Number(req.params.id),
        req.user.id,
        name,
      );
      res.json({ data: team });
    },

    async deleteTeam(req, res) {
      await teamService.deleteTeam(Number(req.params.id), req.user.id);
      res.status(204).end();
    },

    async listMembers(req, res) {
      const members = await teamService.listMembers(
        Number(req.params.id),
        req.user.id,
      );
      res.json({ data: members });
    },

    async addMember(req, res) {
      const { username, role } = validate(addMemberSchema, req.body);
      const members = await teamService.addMember(
        Number(req.params.id),
        req.user.id,
        username,
        role,
      );
      res.status(201).json({ data: members });
    },

    async updateMemberRole(req, res) {
      const { role } = validate(updateRoleSchema, req.body);
      const members = await teamService.updateMemberRole(
        Number(req.params.id),
        req.user.id,
        Number(req.params.userId),
        role,
      );
      res.json({ data: members });
    },

    async removeMember(req, res) {
      await teamService.removeMember(
        Number(req.params.id),
        req.user.id,
        Number(req.params.userId),
      );
      res.status(204).end();
    },
  };
}
