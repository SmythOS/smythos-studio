import httpStatus from 'http-status';
import { DEFAULT_ROLE_POSTFIX, DEFAULT_ROLES } from '../constants/roles.constants';
import { ExpressHandler, ExpressHandlerWithParams } from '../../../../types';
import { teamInvitationService, teamService, teamSettingsService } from '../services';
import { authExpressHelpers } from '../../auth/helpers/auth-express.helper';

// Function to ensure default roles exist and return any newly created roles
async function ensureDefaultRoles(teamId: string, existingRoles: any[]): Promise<any[]> {
  const newRoles = [];

  // Filter default roles
  const defaultRoles = existingRoles.filter(role => role.acl?.default_role);
  async function createRole(name: string, roleData: any) {
    const newRole = await teamService.createTeamRole({
      teamId,
      name,
      acl: roleData.acl as object,
      canManageTeam: roleData.canManageTeam,
    });
    newRoles.push(newRole);
  }

  // Check for missing default roles
  for (const [roleName, roleData] of Object.entries(DEFAULT_ROLES)) {
    const existingDefaultRole = defaultRoles.find(
      role => role.name.toLowerCase() === roleName.toLowerCase() || role.name.toLowerCase() === `${roleName.toLowerCase()} ${DEFAULT_ROLE_POSTFIX}`,
    );

    if (!existingDefaultRole) {
      await createRole(roleName, roleData);
    }
  }

  return newRoles;
}

export const getTeamInfo: ExpressHandler<
  {},
  {
    team: any;
  }
> = async (req, res) => {
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const team = await teamService.getTeamDetails(teamId);

  res.status(httpStatus.OK).json({
    message: 'Team retrieved successfully',
    team: {
      ...team,
      userId,
    },
  });
};

export const getMembers: ExpressHandler<
  {},
  {
    members: any;
  }
> = async (req, res) => {
  const { includeRoles } = req.query;
  const teamId = authExpressHelpers.getTeamId(res);

  const members = await teamService.listMembers(teamId, {
    includeRoles: includeRoles === 'true',
  });

  res.status(httpStatus.OK).json({
    message: 'Members retrieved successfully',
    members,
  });
};

export const deleteMember: ExpressHandlerWithParams<
  {
    memberId: string;
  },
  {},
  {}
> = async (req, res) => {
  const { memberId } = req.params;
  const parentTeamId = authExpressHelpers.getParentTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  await teamService.removeMemberFromTeam(+memberId, userId, parentTeamId);

  res.status(httpStatus.OK).json({
    message: 'Member deleted successfully',
  });
};

export const getMyRoles: ExpressHandler<
  {},
  {
    role: any;
  }
> = async (req, res) => {
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const role = await teamService.getMemberRole(userId, teamId);

  res.status(httpStatus.OK).json({
    message: 'Role retrieved successfully',
    role,
  });
};

export const updateMemberRole: ExpressHandlerWithParams<
  {
    memberId: string;
  },
  {
    roleId?: number;
    userSpecificAcl?: object;
  },
  {
    message: string;
  }
> = async (req, res) => {
  const { memberId } = req.params;
  const { roleId, userSpecificAcl } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  // await teamService.checkIfCanManageTeamOrThrow(userId, teamId);
  await teamService.updateMemberRole({
    teamId,
    caller: { userId },
    member: { userId: +memberId, newRoleId: roleId },
  });

  res.status(httpStatus.OK).json({
    message: 'Member role updated successfully',
  });
};

export const updateMemberSpecificAcl: ExpressHandler<
  {
    memberId: number;
    userSpecificAcl: object;
  },
  {
    message: string;
  }
> = async (req, res) => {
  const { memberId, userSpecificAcl } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  await teamService.checkMemberExistsOrThrow(+memberId, teamId);
  // await teamService.checkIfCanManageTeamOrThrow(userId, teamId);
  await teamService.updateMemberSpecificAcl({
    memberId,
    teamId,
    userSpecificAcl,
  });

  res.status(httpStatus.OK).json({
    message: 'Member role updated successfully',
  });
};

export const getTeamRoles: ExpressHandler<
  {},
  {
    roles: any;
  }
> = async (req, res) => {
  const teamId = authExpressHelpers.getTeamId(res);
  // Fetch all roles
  let roles = await teamService.listAllTeamRoles(teamId);

  // Ensure default roles exist and get any newly created roles
  const newRoles = await ensureDefaultRoles(teamId, roles);

  // Combine existing roles with any new roles
  roles = [...roles, ...newRoles];

  res.status(httpStatus.OK).json({
    message: 'Roles retrieved successfully',
    roles,
  });
};

export const createTeamRole: ExpressHandler<
  {
    name: string;
    canManageTeam: boolean;
    acl: object;
  },
  {
    role: any;
  }
> = async (req, res) => {
  const { name, canManageTeam, acl } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const role = await teamService.createTeamRole({
    name,
    canManageTeam,
    acl,
    teamId,
  });

  res.status(httpStatus.OK).json({
    message: 'Role created successfully',
    role,
  });
};

export const getTeamRole: ExpressHandler<
  {
    roleId: number;
  },
  {
    role: any;
  }
> = async (req, res) => {
  const { roleId } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const role = await teamService.getTeamRole(+roleId, teamId);

  res.status(httpStatus.OK).json({
    message: 'Role retrieved successfully',
    role,
  });
};

export const deleteTeamRole: ExpressHandler<
  {
    roleId: number;
  },
  {
    message: string;
  }
> = async (req, res) => {
  const { roleId } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  await teamService.deleteTeamRole(+roleId, teamId);

  res.status(httpStatus.OK).json({
    message: 'Role deleted successfully',
  });
};

export const updateTeamRole: ExpressHandler<
  {
    roleId: number;
    name?: string;
    canManageTeam?: boolean;
    acl?: object;
  },
  {
    role: any;
  }
> = async (req, res) => {
  const { name, canManageTeam, acl, roleId } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const role = await teamService.updateTeamRole({
    roleId: +roleId,
    name,
    canManageTeam,
    acl,
    teamId,
  });

  res.status(httpStatus.OK).json({
    message: 'Role updated successfully',
    role,
  });
};

// TEAM INVITATIONS

export const createTeamInvite: ExpressHandler<
  {
    email: string;
    roleId: number;
    spaceMemberId?: string;
    orgMemberId?: string;
    agentId?: string;
    agentName?: string;
    spaceId?: string;
    teamId?: string;
  },
  {
    invitation: any;
  }
> = async (req, res) => {
  const { email, roleId } = req.body;
  const parentTeamId = authExpressHelpers.getParentTeamId(res);
  const userId = authExpressHelpers.getUserId(res);
  const userEmail = authExpressHelpers.getUserEmail(res);
  const name = authExpressHelpers._getLogtoUser(res).name;

  const invitation = await teamInvitationService.createTeamInvite({
    email,
    // callerUserId: userId,
    caller: { userId, email: userEmail, name },
    invitationRoleId: roleId,
    parentTeamId,
    givenTeamId: req.body.teamId,
    spaceId: req.body.spaceId,
    agentId: req.body.agentId,
    agentName: req.body.agentName,
  });

  res.status(httpStatus.OK).json({
    message: 'Invitation created successfully',
    invitation,
  });
};

export const createTeamWithSubteamInvite: ExpressHandler<
  {
    email: string;
    roleId: number;
    spaceId?: string;
    organizationId?: string;
  },
  {
    invitation: any;
  }
> = async (req, res) => {
  const { email, roleId, spaceId, organizationId } = req.body;
  const userId = authExpressHelpers.getUserId(res);
  const userEmail = authExpressHelpers.getUserEmail(res);
  const name = authExpressHelpers._getLogtoUser(res).name;

  const invitation = await teamInvitationService.createTeamWithSubteamInvite({
    email,
    // callerUserId: userId,
    caller: { userId, email: userEmail, name },
    invitationRoleId: roleId,
    spaceId,
    organizationId,
  });

  res.status(httpStatus.OK).json({
    message: 'Invitation created successfully',
    invitation,
  });
};

export const createTeamShareAgentInvite: ExpressHandler<
  {
    email: string;
    agentId?: string;
    agentName?: string;
  },
  {
    invitation: any;
  }
> = async (req, res) => {
  const { email } = req.body;
  const parentTeamId = authExpressHelpers.getParentTeamId(res);
  const targetTeamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);
  const userEmail = authExpressHelpers.getUserEmail(res);
  const name = authExpressHelpers._getLogtoUser(res).name;

  const invitation = await teamInvitationService.createTeamShareAgentInvite({
    email,
    caller: { userId, email: userEmail, name },
    teamId: targetTeamId,
    agentId: req.body.agentId,
    agentName: req.body.agentName,
  });

  res.status(httpStatus.OK).json({
    message: 'Invitation created successfully',
    invitation,
  });
};
export const acceptTeamInvite: ExpressHandlerWithParams<
  {
    invitationId: string;
  },
  {
    agentId?: string;
    addToSpaceId?: string;
    addToSpaceRoleId?: number;
  },
  {
    message: string;
    data?: {
      spaceId?: string;
      organizationId?: string;
    };
  }
> = async (req, res) => {
  const { invitationId } = req.params;
  const userId = authExpressHelpers.getUserId(res);
  const existingTeamId = authExpressHelpers.getParentTeamId(res);

  const { spaceId, organizationId } = await teamInvitationService.acceptTeamInvite({
    email: authExpressHelpers.getUserEmail(res),
    token: invitationId,
    existingTeamId,
    userId,
    agentId: req.body.agentId,
    addToSpaceId: req.body.addToSpaceId,
    addToSpaceRoleId: req.body.addToSpaceRoleId,
  });

  res.status(httpStatus.OK).json({
    message: 'Invitation accepted successfully',
    data: {
      spaceId,
      organizationId,
    },
  });
};

export const listTeamInvites: ExpressHandler<
  {},
  {
    invitations: any;
  }
> = async (req, res) => {
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const invitations = await teamInvitationService.getTeamInvitations(teamId, userId);

  res.status(httpStatus.OK).json({
    message: 'Invitations retrieved successfully',
    invitations,
  });
};

export const deleteTeamInvite: ExpressHandlerWithParams<
  {
    invitationId: string;
  },
  {},
  {
    message: string;
  }
> = async (req, res) => {
  const { invitationId } = req.params;
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  await teamInvitationService.deleteTeamInvitation(+invitationId, teamId, userId);

  res.status(httpStatus.OK).json({
    message: 'Invitation deleted successfully',
  });
};

export const assignMemberToSubteam: ExpressHandlerWithParams<
  { memberId: string; subteamId: string },
  {
    roleId: number;
    notifyEmail: boolean;
  },
  {
    message: string;
  }
> = async (req, res) => {
  const { roleId } = req.body;
  const { memberId, subteamId } = req.params;
  const userId = authExpressHelpers.getUserId(res);

  await teamService.assignMemberToSubTeam({
    member: { id: +memberId },
    caller: { id: userId },
    subteamId,
    roleId,
    notifyEmail: req.body.notifyEmail,
  });

  res.status(httpStatus.OK).json({
    message: 'Member assigned to subteam successfully',
  });
};

export const reAssignMemberToSubteam: ExpressHandlerWithParams<
  { memberId: string; subteamId: string },
  {
    roleId: number;
  },
  {
    message: string;
  }
> = async (req, res) => {
  const { roleId } = req.body;
  const { memberId, subteamId } = req.params;
  const userId = authExpressHelpers.getUserId(res);

  await teamService.reassignMemberToSubTeam({ member: { id: +memberId }, caller: { id: userId }, subteamId, roleId });

  res.status(httpStatus.OK).json({
    message: 'Member re-assigned to subteam successfully',
  });
};

export const unassignMemberFromSubteam: ExpressHandlerWithParams<
  {
    memberId: string;
    subteamId: string;
  },
  {},
  {
    message: string;
  }
> = async (req, res) => {
  const { memberId, subteamId } = req.params;
  const userId = authExpressHelpers.getUserId(res);

  await teamService.unassignMemberFromSubTeam({ member: { id: +memberId }, caller: { id: userId }, subteamId });

  res.status(httpStatus.OK).json({
    message: 'Member removed from subteam successfully',
  });
};

// TEAM SETTINGS

export const getSettings: ExpressHandler<
  {},
  {
    settings: any[];
  }
> = async (req, res) => {
  const teamId = authExpressHelpers.getTeamId(res);
  const settings = await teamSettingsService.getSettings(teamId);
  return res.json({
    message: 'Settings retrieved successfully',
    settings,
  });
};

export const getSetting: ExpressHandlerWithParams<
  {
    settingKey: string;
  },
  {},
  {
    setting: any;
  }
> = async (req, res) => {
  const teamId = authExpressHelpers.getTeamId(res);
  const { settingKey } = req.params;
  const setting = await teamSettingsService.getSetting(teamId, settingKey);
  res.json({
    message: 'Setting retrieved successfully',
    setting,
  });
};

export const createSetting: ExpressHandler<
  {
    settingKey: string;
    settingValue: string;
  },
  {
    setting: any;
  }
> = async (req, res) => {
  const teamId = authExpressHelpers.getTeamId(res);
  const { settingKey, settingValue } = req.body;
  const newSetting = await teamSettingsService.createSetting(teamId, settingKey, settingValue);
  res.json({
    message: 'Setting updated successfully',
    setting: newSetting,
  });
};

export const deleteSetting: ExpressHandlerWithParams<
  {
    settingKey: string;
  },
  {},
  {}
> = async (req, res) => {
  const teamId = authExpressHelpers.getTeamId(res);
  const { settingKey } = req.params;
  const deletedSetting = await teamSettingsService.deleteSetting(teamId, settingKey);
  res.json({
    message: 'Setting deleted successfully',
  });
};

export const renameTeam: ExpressHandler<
  {
    name: string;
  },
  {
    team: any;
  }
> = async (req, res) => {
  const { name } = req.body;
  const { teamId } = req.params;
  const userId = authExpressHelpers.getUserId(res);

  const team = await teamService.renameTeam({ teamId, name, userId });

  res.status(httpStatus.OK).json({
    message: 'Team renamed successfully',
    team,
  });
};

export const createSubteam: ExpressHandler<
  {
    name: string;
  },
  {
    team: any;
  }
> = async (req, res) => {
  const { name } = req.body;
  const teamId = authExpressHelpers.getTeamId(res);
  const userId = authExpressHelpers.getUserId(res);

  const team = await teamService.createSubteam({ parentTeamId: teamId, name, userId });

  res.status(httpStatus.OK).json({
    message: 'Subteam created successfully',
    team,
  });
};

export const deleteSubteam: ExpressHandlerWithParams<
  {
    subteamId: string;
  },
  {},
  {
    team: any;
  }
> = async (req, res) => {
  const { subteamId } = req.params;
  const userId = authExpressHelpers.getUserId(res);

  const team = await teamService.deleteSubteam({ subteamId, userId });

  res.status(httpStatus.OK).json({
    message: 'Subteam deleted successfully',
    team,
  });
};

export const getAllTeams: ExpressHandlerWithParams<
  {
    id: string;
  },
  {},
  {
    teams: any[];
  }
> = async (req, res) => {
  const { id } = req.params;
  const userId = authExpressHelpers.getUserId(res);

  const teams = await teamService.getAllTeams(id, userId);

  res.status(httpStatus.OK).json({
    message: 'Teams retrieved successfully',
    ...teams,
  });
};
