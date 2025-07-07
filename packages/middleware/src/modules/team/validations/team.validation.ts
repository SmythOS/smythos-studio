import Joi from 'joi';

const aclRuleSchema = Joi.object({
  access: Joi.string().required().allow(null).allow('').valid('r', 'rw', 'w'), // allow null and empty string (for no access)
  redirect: Joi.string().optional(),
  name: Joi.string().optional().allow(null).allow(''),
  internal: Joi.boolean().optional().allow(null).allow(''),
});

export const postTeamRole = {
  body: Joi.object({
    name: Joi.string().required(),
    canBeRemoved: Joi.boolean().optional().allow(null),
    canManageTeam: Joi.boolean().required(),
    acl: Joi.object({
      page: Joi.object()
        .pattern(
          Joi.string(), // for [key: string]
          aclRuleSchema, // for the rule structure
        )
        .required(),
      api: Joi.object()
        .pattern(
          Joi.string(), // for [key: string]
          aclRuleSchema, // for the rule structure
        )
        .required(),
    }),
  }),
};

export const deleteMember = {
  params: Joi.object({
    memberId: Joi.number().required(),
  }),
};

export const putTeamRole = {
  body: Joi.object({
    name: Joi.string().optional(),
    canBeRemoved: Joi.boolean().optional().allow(null),
    canManageTeam: Joi.boolean().optional(),
    acl: Joi.object({
      page: Joi.object()
        .pattern(
          Joi.string(), // for [key: string]
          aclRuleSchema, // for the rule structure
        )
        .required(),
      api: Joi.object()
        .pattern(
          Joi.string(), // for [key: string]
          aclRuleSchema, // for the rule structure
        )
        .required(),
    }),
    roleId: Joi.number().required(),
  }),
};
export const postTeam = {
  body: Joi.object({
    name: Joi.string().required(),
  }),
};

export const postTeamInvitation = {
  body: Joi.object({
    email: Joi.string().email().required(),
    roleId: Joi.number().required(),
    teamId: Joi.string().allow(null, '').optional(),
    spaceId: Joi.string().allow(null, '').optional(),
    agentId: Joi.string().allow(null, '').optional(),
    agentName: Joi.string().allow(null, '').optional(),
  }),
};

export const postTeamWithSubteamInvitation = {
  body: Joi.object({
    email: Joi.string().email().required(),
    roleId: Joi.number().required(),
    spaceId: Joi.string().allow(null, '').optional(),
    organizationId: Joi.string().allow(null, '').optional(),
  }),
};

export const postTeamShareAgentInvitation = {
  body: Joi.object({
    email: Joi.string().email().required(),
    agentId: Joi.string().allow(null, '').optional(),
    agentName: Joi.string().allow(null, '').optional(),
  }),
};

export const acceptTeamInvitation = {
  body: Joi.object({
    agentId: Joi.string().allow(null, '').optional(),
    addToSpaceId: Joi.string().allow(null, '').optional(),
    addToSpaceRoleId: Joi.number().allow(null).optional(),
  }),
  params: Joi.object({
    invitationId: Joi.string().required(),
  }),
};

export const deleteTeamInvitation = {
  params: Joi.object({
    invitationId: Joi.string().required(),
  }),
};

export const updateMemberRole = {
  body: Joi.object({
    userSpecificAcl: Joi.string().optional(),
    roleId: Joi.number().optional(),
  }),

  params: Joi.object({
    memberId: Joi.number().required(),
  }),
};

export const createSetting = {
  body: Joi.object({
    settingKey: Joi.string().required(),
    settingValue: Joi.string().required(),
  }),
};

export const getSetting = {
  params: Joi.object({
    settingKey: Joi.string().required(),
  }),
};

export const deleteSetting = {
  params: Joi.object({
    settingKey: Joi.string().required(),
  }),
};

export const getSettingsM2M = {
  params: Joi.object({
    teamId: Joi.string().required(),
  }),
};

export const getSettingM2M = {
  params: Joi.object({
    teamId: Joi.string().required(),
    settingKey: Joi.string().required(),
  }),
};

export const getTeamsM2M = {
  query: Joi.object({
    page: Joi.number().optional().default(1),
    limit: Joi.number().optional().default(10),
    email: Joi.string().optional(),
  }),
};

export const getTeamInfoM2M = {
  params: Joi.object({
    teamId: Joi.string().required(),
  }),
};

export const createSettingM2M = {
  params: Joi.object({
    teamId: Joi.string().required(),
  }),
  body: Joi.object({
    settingKey: Joi.string().required(),
    settingValue: Joi.string().required(),
  }),
};

export const deleteSettingM2M = {
  params: Joi.object({
    teamId: Joi.string().required(),
    settingKey: Joi.string().required(),
  }),
};

export const unassignMemberFromSubteam = {
  params: Joi.object({
    memberId: Joi.number().required(),
    subteamId: Joi.string().required(),
  }),
};

export const assignMemberToSubteam = {
  body: Joi.object({
    roleId: Joi.number().required(),
    notifyEmail: Joi.boolean().optional().default(true),
  }),
  params: Joi.object({
    memberId: Joi.number().required(),
    subteamId: Joi.string().required(),
  }),
};
