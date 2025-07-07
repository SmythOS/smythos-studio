/* eslint-disable @typescript-eslint/no-empty-function */
import { prisma } from '../../../../prisma/prisma-client';
import ApiError from '../../../utils/apiError';
import httpStatus from 'http-status';
import { PrismaTransaction, Transactional } from '../../../../types';
import errKeys from '../../../utils/errorKeys';
import { includePagination, PRISMA_ERROR_CODES } from '../../../utils/general';
import * as quotaUtils from '../../quota/utils';
import { retrieveDefaultPlan } from '../../subscription/services/subscription.service';
import { subscriptionService } from '../../subscription/services';
import { LOGGER } from '../../../../config/logging';
import { config } from '../../../../config/config';

export const createUserTeam = async ({
  name,
  userId,
  options,
}: {
  name?: string;
  userId: number;
  options?: {
    tx?: PrismaTransaction;
  };
}) => {
  const runOperations = async (tx: PrismaTransaction) => {
    // let defaultPlan = await tx.plan.findFirst({
    //   where: {
    //     isDefaultPlan: true,
    //   },
    //   select: {
    //     id: true,
    //   },
    // });

    // if (!defaultPlan) {
    //   defaultPlan = await tx.plan.create({
    //     data: {
    //       name: 'Free Plan',
    //       price: 0,
    //       stripeId: 'no-id',
    //       isDefaultPlan: true,
    //       priceId: 'no-id',
    //     },
    //     select: {
    //       id: true,
    //     },
    //   });
    // }

    const defaultPlan = await retrieveDefaultPlan({});

    const team = await tx.team.create({
      data: {
        name: name ?? 'My Team',
        subscription: {
          create: {
            startDate: new Date(),
            stripeId: '',
            status: 'ACTIVE',
            plan: {
              connect: {
                id: defaultPlan.id,
              },
            },
          },
        },

        users: {
          connect: {
            id: userId,
          },
        },
      },

      select: {
        id: true,
      },
    });

    const superAdminRole = await tx.teamRole.create({
      data: {
        // super admin role
        name: 'Super Admin',
        isOwnerRole: true,
        canManageTeam: true,
        teamId: team.id,
      },

      select: {
        id: true,
      },
    });

    // assign the user to the super admin role
    await tx.userTeamRole.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },
        sharedTeamRole: {
          connect: {
            id: superAdminRole.id,
          },
        },
        isTeamInitiator: true,
      },
    });

    return team;
  };

  let team: { id: string };
  if (options?.tx) {
    team = await runOperations(options.tx);
  } else {
    team = await prisma.$transaction(runOperations, {
      timeout: 30_000, // 30 second timeout
      maxWait: 10_000, // 10 second max wait
    });
  }

  return team;
};

export const listMembers = async (
  teamId: string,
  options?: {
    includeRoles?: boolean;
  },
) => {
  const includeRolesFields = {
    where: {
      sharedTeamRole: {
        teamId,
      },
    },
    select: {
      userSpecificAcl: true,
      isTeamInitiator: true,

      sharedTeamRole: {
        select: {
          acl: true,
          name: true,
          id: true,
          isOwnerRole: true,
          canManageTeam: true,
        },
      },
    },
  };

  let members = await prisma.user.findMany({
    where: {
      userTeamRole: {
        some: {
          sharedTeamRole: {
            teamId,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      avatar: true,

      ...(options?.includeRoles ? { userTeamRole: includeRolesFields } : {}),
    },
  });

  if (options?.includeRoles) {
    // @ts-ignore
    members = members.map(member => ({
      ...member,
      userTeamRole: member.userTeamRole[0],
    }));
  }

  return members;
};

export const isUserPartOfTeam = async (userId: number, teamId: string) => {
  if (!userId || !teamId) {
    LOGGER.error(new Error('isUserPartOfTeam: userId or teamId is missing'));
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Internal error');
  }
  // check if the user is part of the team
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
      userTeamRole: {
        some: {
          sharedTeamRole: {
            teamId,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  return !!user;
};

export const getTeamDetails = async (teamId: string) => {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      id: true,
      name: true,
      parentId: true,
      subscription: {
        select: {
          id: true,
          status: true,
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              stripeId: true,
              properties: true,
              isDefaultPlan: true,
              friendlyName: true,
            },
          },
          properties: true,
          endDate: true,
          startDate: true,
          updatedAt: true,
        },
      },
    },
  });

  const owner = await getTeamOwner({ teamId });

  return {
    ...team,
    owner,
  };
};
export const getTeamDetailsM2M = async (teamId: string) => {
  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      id: true,
      name: true,
      subscription: {
        select: {
          id: true,
          status: true,
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              stripeId: true,
            },
          },
          endDate: true,
          startDate: true,
          updatedAt: true,
        },
      },

      subTeams: {
        select: {
          id: true,
          name: true,
        },
      },
      parentId: true,

      salt: true,
    },
  });

  return team;
};

export const listAllTeamRoles = async (teamId: string) => {
  const roles = await prisma.teamRole.findMany({
    where: {
      teamId,
    },
    select: {
      id: true,
      name: true,
      isOwnerRole: true,
      canManageTeam: true,
      acl: true,

      userTeamRole: {
        select: {
          user: {
            select: {
              avatar: true,
              email: true,
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return roles;
};

export const getTeamRole = async (roleId: number, teamId: string) => {
  const role = await prisma.teamRole
    .findUniqueOrThrow({
      where: {
        id: roleId,
        teamId,
      },
      select: {
        id: true,
        name: true,
        isOwnerRole: true,
        canManageTeam: true,
        acl: true,
      },
    })
    .catch(err => {
      if (err.code === PRISMA_ERROR_CODES.NON_EXISTENT_RECORD) throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
      throw err;
    });

  return role;
};

//
export const createTeamRole = async ({ name, canManageTeam, acl, teamId }: { name: string; canManageTeam: boolean; acl: object; teamId: string }) => {
  const role = await prisma.teamRole.create({
    data: {
      name,
      canManageTeam,
      acl,
      team: {
        connect: {
          id: teamId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      isOwnerRole: true,
      canManageTeam: true,
      acl: true,
    },
  });

  return role;
};

export const updateTeamRole = async ({
  roleId,
  name,
  canManageTeam,
  acl,
  teamId,
}: {
  roleId: number;
  name?: string;
  canManageTeam?: boolean;
  acl?: object;
  teamId: string;
}) => {
  await checkTeamRoleExistsOrThrow(+roleId, teamId);

  // check if the user with the "canManageTeam" permission is trying to update the
  // role of the team initiator (the user who created the team)
  // if so, throw an error because the role of the team initiator cannot be removed from the team
  //* CAN BE CHANGED IN THE FUTURE

  // TODO: refactor this to only get the role id and isOwnerRole
  const teamInitiatorRole = await prisma.userTeamRole.findFirst({
    where: {
      isTeamInitiator: true,
      sharedTeamRole: {
        teamId,
      },
    },
    select: {
      isTeamInitiator: true,
      sharedTeamRole: {
        select: {
          id: true,
          isOwnerRole: true,
        },
      },
    },
  });

  if (teamInitiatorRole?.sharedTeamRole.id === roleId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You cannot update the role of the team owner');
  }

  const role = await prisma.teamRole.update({
    where: {
      teamId_id: {
        teamId,
        id: roleId,
      },
    },
    data: {
      name,
      canManageTeam,
      acl,
    },
    select: {
      id: true,
      name: true,
      isOwnerRole: true,
      canManageTeam: true,
      acl: true,
    },
  });

  return role;
};

export const deleteTeamRole = async (roleId: number, teamId: string) => {
  // check if any relations(users) are using this role
  // if so, throw an error

  const role = await prisma.teamRole.findFirst({
    where: {
      id: roleId,
      teamId,
    },
    select: {
      _count: {
        select: {
          userTeamRole: true,
        },
      },
    },
  });

  if (role?._count?.userTeamRole) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Cannot delete role. It is being used by some members');
  }

  const deleted = await prisma.teamRole.deleteMany({
    where: {
      id: roleId,
      teamId,
    },
  });

  if (!deleted.count) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }
};

// user roles
export const getMemberRole = async (userId: number, teamId: string) => {
  const roles = await prisma.userTeamRole.findFirst({
    where: {
      userId,
      sharedTeamRole: {
        teamId,
      },
    },
    select: {
      sharedTeamRole: {
        select: {
          id: true,
          name: true,
          isOwnerRole: true,
          canManageTeam: true,
          acl: true,
        },
      },
      isTeamInitiator: true,
      roleId: true,
      userSpecificAcl: true,
      userId: true,
    },
  });

  return roles;
};

export const updateMemberRole = async ({
  member,
  caller,
  teamId,
}: {
  member: {
    userId: number;
    newRoleId?: number;
  };

  caller: {
    userId: number;
  };

  teamId: string;
}) => {
  await checkMemberExistsOrThrow(+member.userId, teamId);

  const currentMemberTeamRole = await prisma.userTeamRole.findFirst({
    where: {
      userId: member.userId,
      sharedTeamRole: {
        teamId,
      },
    },
    select: {
      isTeamInitiator: true,
      sharedTeamRole: {
        select: {
          canManageTeam: true,
        },
      },
    },
  });

  if (currentMemberTeamRole?.isTeamInitiator) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team initiator role cannot be updated');
  }

  const currentTeamRole = await prisma.teamRole.findFirst({
    where: {
      teamId,
      userTeamRole: {
        some: {
          userId: member.userId,
        },
      },
    },
    select: {
      isOwnerRole: true,
      canManageTeam: true,
      id: true,
    },
  });

  const newTeamRole = await prisma.teamRole.findFirst({
    where: {
      teamId,
      id: member.newRoleId,
    },
    select: {
      isOwnerRole: true,
      canManageTeam: true,
      id: true,
    },
  });

  const callerTeamRole = await prisma.teamRole.findFirst({
    where: {
      teamId,
      userTeamRole: {
        some: {
          userId: caller.userId,
        },
      },
    },
    select: {
      isOwnerRole: true,
      canManageTeam: true,
    },
  });

  if (!newTeamRole) {
    throw new ApiError(httpStatus.NOT_FOUND, 'New role not found');
  }
  //* Super Admin in this context means: anyone who cannot be removed from the team

  // if caller is trying to update their own role
  if (caller.userId === member.userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You cannot update your own role');
  }

  // if (!callerTeamRole!.canManageTeam) {
  //   throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update member roles');
  // }

  // if the member's new role is a can manage team and the caller cannot, throw an error
  if (newTeamRole.canManageTeam === true && callerTeamRole!.canManageTeam === false) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You cannot update this member role');
  }

  const role = await prisma.userTeamRole.update({
    where: {
      userId_roleId: {
        userId: member.userId,
        roleId: currentTeamRole!.id,
      },
    },
    data: {
      ...(newTeamRole.id
        ? {
            sharedTeamRole: {
              connect: {
                id: newTeamRole.id,
              },
            },
          }
        : {}),
    },
  });

  return role;
};

export const updateMemberSpecificAcl = async ({
  memberId,
  teamId,
  userSpecificAcl,
}: {
  memberId: number;
  teamId: string;
  userSpecificAcl: object;
}) => {
  const exisitingRole = await prisma.userTeamRole.findFirstOrThrow({
    where: {
      userId: memberId,
      sharedTeamRole: {
        teamId,
      },
    },
    select: {
      roleId: true,
    },
  });

  const role = await prisma.userTeamRole.update({
    where: {
      userId_roleId: {
        userId: memberId,
        roleId: exisitingRole.roleId,
      },
    },
    data: {
      userSpecificAcl,
    },
  });

  return role;
};

export const checkMemberExistsOrThrow = async (memberId: number, teamId: string, options?: { tx?: PrismaTransaction }) => {
  // eslint-disable-next-line no-underscore-dangle
  const _prisma = options?.tx ?? prisma;

  const member = await _prisma.user.findFirst({
    where: {
      id: memberId,
      // teamId,
      userTeamRole: {
        some: {
          sharedTeamRole: {
            teamId,
          },
        },
      },
    },

    select: {
      id: true,
    },
  });

  if (!member) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Member not found');
  }

  return member;
};

export const checkIfCanManageTeamOrThrow = async (userId: number, teamId: string) => {
  const role = await prisma.userTeamRole.findFirst({
    where: {
      userId,
      sharedTeamRole: {
        teamId,
        canManageTeam: true,
      },
    },

    select: {
      roleId: true,
    },
  });

  if (!role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to perform this action', errKeys.NOT_ENOUGH_PERMISSIONS);
  }

  return role;
};

export const checkTeamRoleExistsOrThrow = async (
  roleId: number,
  teamId: string,
  options?: {
    tx?: PrismaTransaction;
  },
) => {
  const _p = options?.tx || prisma;
  const role = await _p.teamRole.findUnique({
    where: {
      teamId_id: {
        teamId,
        id: roleId,
      },
    },
    select: {
      id: true,
    },
  });

  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }

  return role;
};

/**
 * Deletes all user team roles for a given user team (parent team) and its sub-teams
 */
export const deleteUserTeamRoles = async ({
  parentTeamId,
  userId,
  options,
}: {
  parentTeamId: string;
  userId: number;
  options?: { tx?: PrismaTransaction };
}) => {
  const runOperations = async (tx: PrismaTransaction) => {
    const userRoles = await tx.userTeamRole.findMany({
      where: {
        userId,
      },
      select: {
        roleId: true,
        sharedTeamRole: {
          select: {
            team: {
              select: {
                id: true,
                parentId: true,
              },
            },
          },
        },
      },
    });
    const rolesToDelete = userRoles.filter(r => r.sharedTeamRole.team.parentId === parentTeamId || r.sharedTeamRole.team.id === parentTeamId);

    await tx.userTeamRole.deleteMany({
      where: {
        userId,
        roleId: {
          in: rolesToDelete.map(r => r.roleId),
        },
      },
    });
  };

  if (options?.tx) {
    await runOperations(options.tx);
  } else {
    await prisma.$transaction(runOperations);
  }
};

export const getTeamOwner = async ({ teamId, ctx }: Transactional<{ teamId: string }>) => {
  const _tx = ctx?.tx ?? prisma;

  const owner = await _tx.user.findFirstOrThrow({
    where: {
      userTeamRole: {
        some: {
          isTeamInitiator: true,
          sharedTeamRole: {
            teamId,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      avatar: true,
    },
  });

  return owner;
};

export const getTeamAdmins = async ({ teamId, ctx }: Transactional<{ teamId: string }>) => {
  const _tx = ctx?.tx ?? prisma;

  const admins = await _tx.user.findMany({
    where: {
      userTeamRole: {
        some: {
          sharedTeamRole: {
            isOwnerRole: true, // admins are on the same team role as the owner
            teamId,
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
    },
  });

  return admins;
};

export const listTeamsM2M = async (options?: {
  pagination?: {
    page?: number;
    limit?: number;
  };
  emailSearchTerm?: string;
}) => {
  const whereClause = {
    ...(options?.emailSearchTerm
      ? {
          users: {
            some: {
              email: {
                contains: options.emailSearchTerm,
              },
            },
          },
        }
      : {}),
  };

  const teams = await prisma.team.findMany({
    ...includePagination(options?.pagination),

    where: whereClause,

    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          aiAgents: true,
        },
      },
      users: {
        where: {
          userTeamRole: {
            some: {
              isTeamInitiator: true,
            },
          },
        },
      },
      subscription: {
        select: {
          id: true,
          status: true,
          properties: true,
          endDate: true,
          startDate: true,
          updatedAt: true,

          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              stripeId: true,
              properties: true,
              isCustomPlan: true,
              priceId: true,
              isDefaultPlan: true,
              paid: true,
              description: true,
            },
          },
        },
      },
    },
  });

  teams.forEach(team => {
    if (team.subscription?.plan) {
      // eslint-disable-next-line no-param-reassign
      team.subscription.plan.properties = quotaUtils.fillPlanProps(team.subscription?.plan.properties as object) as any;
      // eslint-disable-next-line no-param-reassign
      team.subscription.properties = quotaUtils.fillSubscriptionProps(team.subscription.properties as object) as any;
    }
  });

  const count = await prisma.team.count({ where: whereClause });

  return {
    teams: teams.map(team => ({
      id: team.id,
      name: team.name,
      createdAt: team.createdAt,
      data: {
        users: team._count.users,
        aiAgents: team._count.aiAgents,
      },
      subscription: team.subscription,
      owner: team.users[0],
    })),

    count,
  };
};

export const getAllTeams = async (parentId: string, userId: number) => {
  try {
    // Use a single transaction for all database operations
    return await prisma.$transaction(
      async tx => {
        // 1. Get teams
        const teams = await tx.team.findMany({
          where: {
            OR: [{ id: parentId }, { parentId }],
          },
          select: {
            id: true,
            name: true,
            parentId: true,
          },
        });

        if (!teams.length) {
          return { teams: [] };
        }

        const teamIds = teams.map(team => team.id);

        // 2. Get all user team roles and user data in a single query
        const userTeamRoles = await tx.userTeamRole.findMany({
          where: {
            sharedTeamRole: {
              teamId: {
                in: teamIds,
              },
            },
          },
          select: {
            userId: true,
            roleId: true,
            isTeamInitiator: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            sharedTeamRole: {
              select: {
                teamId: true,
                name: true,
                canManageTeam: true,
                isOwnerRole: true,
              },
            },
          },
        });

        // 3. Get user settings in a single query
        const userIds = [...new Set(userTeamRoles.map(role => role.userId))];
        const userSettings = await tx.userSetting.findMany({
          where: {
            userId: {
              in: userIds,
            },
            settingKey: 'UserMarketingMetadata',
          },
          select: {
            userId: true,
            settingValue: true,
            settingKey: true,
          },
        });

        // 4. Create lookup maps for faster access
        const settingsByUserId = new Map();
        userSettings.forEach(setting => {
          if (!settingsByUserId.has(setting.userId)) {
            settingsByUserId.set(setting.userId, []);
          }
          settingsByUserId.get(setting.userId).push(setting);
        });

        const rolesByTeamId = new Map();
        userTeamRoles.forEach(role => {
          const teamId = role.sharedTeamRole.teamId;
          if (!rolesByTeamId.has(teamId)) {
            rolesByTeamId.set(teamId, []);
          }
          // Add settings to role
          const settings = settingsByUserId.get(role.userId) || [];
          rolesByTeamId.get(teamId).push({
            ...role,
            settings,
          });
        });

        // 5. Format final response using maps
        const formattedTeams = teams.map(team => ({
          ...team,
          users: rolesByTeamId.get(team.id) || [],
        }));

        return {
          teams: formattedTeams,
        };
      },
      {
        timeout: 15000, // 15 second timeout
        maxWait: 10000, // 10 second max wait
      },
    );
  } catch (error) {
    // Log the error for debugging
    LOGGER.error('Error in getAllTeams:', {
      error,
      parentId,
      userId,
      stack: error.stack,
    });

    if (error?.code === 'P2034') {
      // Prisma transaction timeout error code
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Database operation timed out. Please try again.');
    }

    throw error;
  }
};
