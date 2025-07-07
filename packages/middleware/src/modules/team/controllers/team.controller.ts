import httpStatus from 'http-status';
import { DEFAULT_ROLE_POSTFIX, DEFAULT_ROLES } from '../constants/roles.constants';
import { ExpressHandler, ExpressHandlerWithParams } from '../../../../types';
import { teamService, teamSettingsService } from '../services';
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
