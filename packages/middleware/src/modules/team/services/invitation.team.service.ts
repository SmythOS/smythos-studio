import httpStatus from 'http-status';
import { prisma } from '../../../../prisma/prisma-client';
import ApiError from '../../../utils/apiError';
import { checkTeamRoleExistsOrThrow, getTeamAdmins, implicitlyDeleteParentTeam, implicitlyLeaveTeam } from './team.service';
import { mailService } from '../../mail/services';
import { quotaService } from '../../quota/services';
import { LOGGER } from '../../../../config/logging';
import errKeys from '../../../utils/errorKeys';
import { teamService, teamSettingsService } from '.';
import { subscriptionService } from '../../subscription/services';
import { usageReporter } from '../../quota/services/UsageReporter';
import { config } from '../../../../config/config';

async function getSpaceRoleId(teamId: string, role: string) {
  try {
    const setting = await teamSettingsService.getSetting(teamId, role);
    return setting;
  } catch (error) {
    return null;
  }
}

export const createTeamInvite = async ({
  email,
  caller,
  parentTeamId: teamId,
  invitationRoleId,
  givenTeamId,
  spaceId,
  agentId,
  agentName,
}: {
  email: string;
  caller: {
    userId: number;
    email: string;
    name: string | null;
  };
  parentTeamId: string;
  invitationRoleId: number;
  givenTeamId?: string;
  spaceId?: string;
  agentId?: string;
  agentName?: string;
}) => {
  await teamService.checkIfCanManageTeamOrThrow(caller.userId, teamId);
  const teamIdToCheck = agentId ? spaceId || givenTeamId : teamId;
  const invitation = await prisma.$transaction(
    async tx => {
      await checkTeamRoleExistsOrThrow(invitationRoleId, teamIdToCheck, {
        tx,
      });

      // check if the user have already been invited
      const existingInvitation = await tx.teamInvitation.findFirst({
        where: {
          email,
          teamId,
          status: 'PENDING',
        },
        select: {
          expiresAt: true,
          id: true,
          code: true,
        },
      });

      // if user is trying to invite themselves, throw an error
      if (email === caller.email) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You cannot invite yourself');
      }

      const receivers = await tx.user.findMany({
        where: {
          email,
        },
        select: {
          name: true,
          userTeamRole: {
            select: {
              sharedTeamRole: {
                select: {
                  teamId: true,
                },
              },
            },
          },
        },
      });
      const isReceiverAlreadyInTeam = receivers?.[0]?.userTeamRole.some(role => role.sharedTeamRole.teamId === teamId);
      const isReceiverAlreadyInSpace = receivers?.[0]?.userTeamRole.some(role => role.sharedTeamRole.teamId === spaceId);

      if (isReceiverAlreadyInTeam && !agentId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'User is already part of this team');
      }

      // if the user is already invited, throw an error
      const isInvitationValid = existingInvitation?.expiresAt && existingInvitation?.expiresAt > new Date();

      if (existingInvitation && isInvitationValid && !agentId) {
        throw new ApiError(httpStatus.CONFLICT, 'User already invited');
      } else if (existingInvitation && !agentId) {
        // expired invitation, so delete it
        await tx.teamInvitation.delete({
          where: {
            id: existingInvitation.id,
          },
        });
      }

      // check team members limit quota
      if (!agentId || !isReceiverAlreadyInTeam) {
        const { quotaReached } = await quotaService.checkTeamMembersLimit({ teamId }, { tx });
        if (quotaReached) {
          throw new ApiError(
            httpStatus.FORBIDDEN,
            'Team members limit reached. Please upgrade your plan to add more members',
            errKeys.QUOTA_EXCEEDED,
          );
        }
      }

      const team = await tx.team.findFirst({
        where: {
          id: teamIdToCheck,
        },
        select: {
          name: true,
          parentId: true,
        },
      });

      if (team.parentId !== null && team.parentId !== teamId && !agentId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You cannot invite members to a sub-team. Please invite members to the default team');
      }

      let agentTeamId;
      if (agentId) {
        agentTeamId = await tx.aiAgent.findFirst({
          where: {
            id: agentId,
          },
          select: {
            teamId: true,
          },
        });
      }
      let _invitation;
      const canInviteIfAgent = agentId && !isReceiverAlreadyInTeam && (!existingInvitation || (existingInvitation && !isInvitationValid));
      if (!agentId || canInviteIfAgent) {
        _invitation = await tx.teamInvitation.create({
          data: {
            email,
            team: {
              connect: {
                id: agentId ? teamIdToCheck : teamId,
              },
            },
            createdBy: {
              connect: {
                id: caller.userId,
              },
            },
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
            teamRole: {
              connect: {
                id: invitationRoleId,
              },
            },
          },
        });
      }
      let invitationCode;
      let hasInvitationCode = _invitation?.code;
      if (!agentId) {
        invitationCode = _invitation?.code;
      } else if (agentId) {
        const agentIdParam = (agentId ? `?agentId=${agentId}` : '') + (agentTeamId?.teamId !== teamId ? `&spaceId=${agentTeamId?.teamId}` : '');

        if (!isReceiverAlreadyInTeam && existingInvitation && isInvitationValid) {
          hasInvitationCode = true;
          invitationCode = existingInvitation.code + agentIdParam;
        } else if (hasInvitationCode) {
          invitationCode = `${_invitation.code}${agentIdParam}`;
        } else {
          invitationCode = `builder/${agentId}`;
        }
      }
      // send email
      try {
        if (!agentId) {
          await mailService.sendTemplateMail({
            template: mailService.templates.teamInvitation,
            to: email,
            subject: `You've been invited to join a team`,
            templateData: {
              team: { name: team?.name },
              inviter: { name: caller.name ?? caller.email },
              invitee: { name: receivers?.[0]?.name ?? email },
              invitation: { code: invitationCode },
            },
          });
        } else {
          await mailService.sendTemplateMail({
            template: mailService.templates.shareAgentInvitation,
            to: email,
            subject: `An AI Agent Has Been Shared with You!`,
            templateData: {
              team: { name: team?.name },
              inviter: { name: caller.name, email: caller.email },
              invitee: { name: receivers?.[0]?.name },
              invitation: { code: invitationCode, hasInvitationCode, agentId, agentName },
            },
          });
        }
      } catch (error) {
        LOGGER.error(new Error(`Error sending invitation email: ${error}`));
        throw error;
      }

      return _invitation;
    },
    { timeout: 30_000 },
  );
  return invitation;
};
export const createTeamWithSubteamInvite = async ({
  email,
  caller,
  invitationRoleId,
  organizationId,
  spaceId,
}: {
  email: string;
  caller: {
    userId: number;
    email: string;
    name: string | null;
  };
  invitationRoleId: number;
  organizationId?: string;
  spaceId?: string;
}) => {
  await teamService.checkIfCanManageTeamOrThrow(caller.userId, organizationId);
  await teamService.checkIfCanManageTeamOrThrow(caller.userId, spaceId);
  const invitation = await prisma.$transaction(
    async tx => {
      await checkTeamRoleExistsOrThrow(invitationRoleId, spaceId, {
        tx,
      });

      // if user is trying to invite themselves, throw an error
      if (email === caller.email) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You cannot invite yourself');
      }
      // check if the user have already been invited
      const existingInvitation = await tx.teamInvitation.findFirst({
        where: {
          email,
          teamId: organizationId,
          status: 'PENDING',
        },
        select: {
          expiresAt: true,
          id: true,
          code: true,
        },
      });

      const receivers = await tx.user.findMany({
        where: {
          email,
        },
        select: {
          name: true,
          userTeamRole: {
            select: {
              sharedTeamRole: {
                select: {
                  teamId: true,
                },
              },
            },
          },
        },
      });
      const isReceiverAlreadyInTeam = receivers?.[0]?.userTeamRole.some(role => role.sharedTeamRole.teamId === organizationId);
      const isReceiverAlreadyInSpace = receivers?.[0]?.userTeamRole.some(role => role.sharedTeamRole.teamId === spaceId);

      if (isReceiverAlreadyInSpace) {
        throw new ApiError(httpStatus.FORBIDDEN, 'User is already part of this team');
      }

      // if the user is already invited, throw an error
      const isInvitationValid = existingInvitation?.expiresAt && existingInvitation?.expiresAt > new Date();

      if (existingInvitation && isInvitationValid) {
        throw new ApiError(httpStatus.CONFLICT, 'User already invited');
      } else if (existingInvitation) {
        // expired invitation, so delete it
        await tx.teamInvitation.delete({
          where: {
            id: existingInvitation.id,
          },
        });
      }

      // check team members limit quota
      if (!isReceiverAlreadyInTeam) {
        const { quotaReached } = await quotaService.checkTeamMembersLimit({ teamId: organizationId }, { tx });
        if (quotaReached) {
          throw new ApiError(
            httpStatus.FORBIDDEN,
            'Team members limit reached. Please upgrade your plan to add more members',
            errKeys.QUOTA_EXCEEDED,
          );
        }
      }

      const team = await tx.team.findFirst({
        where: {
          id: organizationId,
        },
        select: {
          name: true,
          parentId: true,
        },
      });

      if (team.parentId !== null && team.parentId !== organizationId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You cannot invite members to a sub-team. Please invite members to the default team');
      }
      let _invitation;
      const canInviteIfAgent = !isReceiverAlreadyInTeam && (!existingInvitation || (existingInvitation && !isInvitationValid));
      const setting = await getSpaceRoleId(organizationId, 'defaultRole');
      let defaultRoleId = setting?.settingValue ? JSON.parse(setting?.settingValue)?.defaultRole?.data?.defaultRoles[organizationId]?.id : null;
      if (!defaultRoleId) {
        // Get all team roles for a parent team
        const teamRoles = await prisma.teamRole.findMany({
          where: {
            teamId: organizationId,
          },
        });

        // Find the Super Admin role ID
        defaultRoleId = teamRoles.find(role => role.name === 'Super Admin')?.id;
      }

      if (canInviteIfAgent) {
        _invitation = await tx.teamInvitation.create({
          data: {
            email,
            team: {
              connect: {
                id: organizationId,
              },
            },
            createdBy: {
              connect: {
                id: caller.userId,
              },
            },
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
            teamRole: {
              connect: {
                id: defaultRoleId,
              },
            },
          },
        });
      }
      let invitationCode;
      let hasInvitationCode = _invitation?.code;
      if (!spaceId) {
        invitationCode = _invitation?.code;
      } else if (spaceId) {
        if (!isReceiverAlreadyInTeam && existingInvitation && isInvitationValid) {
          hasInvitationCode = true;
          invitationCode = existingInvitation.code + (spaceId ? `?spaceId=${spaceId}&spaceRoleId=${invitationRoleId}` : '');
        } else if (hasInvitationCode) {
          invitationCode = `${_invitation.code}?spaceId=${spaceId}&spaceRoleId=${invitationRoleId}`;
        }
      }
      // send email
      try {
        await mailService.sendTemplateMail({
          template: mailService.templates.teamInvitation,
          to: email,
          subject: `You've been invited to join a team`,
          templateData: {
            team: { name: team?.name },
            inviter: { name: caller.name ?? caller.email },
            invitee: { name: receivers?.[0]?.name ?? email },
            invitation: { code: invitationCode },
          },
        });
      } catch (error) {
        LOGGER.error(new Error(`Error sending invitation email: ${error}`));
        throw error;
      }

      return _invitation;
    },
    { timeout: 30_000 },
  );
  return invitation;
};

export const createTeamShareAgentInvite = async ({
  email,
  caller,
  teamId,
  agentId,
  agentName,
}: {
  email: string;
  caller: {
    userId: number;
    email: string;
    name: string | null;
  };
  teamId: string;
  agentId?: string;
  agentName?: string;
}) => {
  const invitation = await prisma.$transaction(
    async tx => {
      // if user is trying to invite themselves, throw an error
      if (email === caller.email) {
        throw new ApiError(httpStatus.FORBIDDEN, 'You cannot invite yourself');
      }
      const receivers = await tx.user.findMany({
        where: {
          email,
        },
        select: {
          name: true,
          userTeamRole: {
            select: {
              sharedTeamRole: {
                select: {
                  teamId: true,
                },
              },
            },
          },
        },
      });
      const isReceiverAlreadyInTeam =
        receivers?.find(receiver => receiver?.userTeamRole?.some(role => role?.sharedTeamRole?.teamId === teamId)) || null;

      if (!isReceiverAlreadyInTeam) {
        throw new ApiError(httpStatus.FORBIDDEN, 'User is not part of this team.');
      }

      const invitationCode = `builder/${agentId}`;
      // send email
      try {
        await mailService.sendTemplateMail({
          template: mailService.templates.shareAgentInvitation,
          to: email,
          subject: `An AI Agent Has Been Shared with You!`,
          templateData: {
            team: { name: '' },
            inviter: { name: caller.name, email: caller.email },
            invitee: { name: receivers?.[0]?.name },
            invitation: { code: invitationCode, hasInvitationCode: false, agentId, agentName },
          },
        });
      } catch (error) {
        LOGGER.error(new Error(`Error sending invitation email: ${error}`));
        throw error;
      }

      return { message: 'Invitation sent successfully', success: true };
    },
    { timeout: 30_000 },
  );
  return invitation;
};

export const acceptTeamInvite = async ({
  email,
  token,
  existingTeamId,
  userId,
  agentId = '',
  addToSpaceId = '',
  addToSpaceRoleId = null,
}: {
  email: string;
  token: string;
  existingTeamId: string;
  userId: number;
  agentId?: string;
  addToSpaceId?: string;
  addToSpaceRoleId?: number;
}) => {
  const _user = await prisma.$transaction(
    async tx => {
      const retVal = { spaceId: null, organizationId: null };
      const invitation = await tx.teamInvitation.findFirst({
        where: {
          code: token,
        },
        select: {
          id: true,
          teamId: true,
          expiresAt: true,
          teamRoleId: true,
          createdBy: {
            select: {
              name: true,
            },
          },
          status: true,
          email: true,
          team: {
            select: {
              name: true,
              id: true,
              parentId: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Invalid invitation');
      }

      if (invitation?.email.toLowerCase() !== email.toLowerCase()) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Invalid email');
      }
      if (invitation.status !== 'PENDING') {
        throw new ApiError(httpStatus.FORBIDDEN, 'Invitation expired');
      }

      if (invitation.expiresAt && invitation.expiresAt < new Date()) {
        // delete the invitation
        await tx.teamInvitation.delete({
          where: {
            id: invitation.id,
          },
        });

        throw new ApiError(httpStatus.NOT_FOUND, 'Invitation expired');
      }

      let agentTeamId;
      if (agentId) {
        agentTeamId = await tx.aiAgent.findFirst({
          where: {
            id: agentId,
          },
          select: {
            teamId: true,
          },
        });
      }

      // team members limit quota check
      const { quotaReached } = await quotaService.checkTeamMembersLimit({ teamId: invitation.teamId }, { tx });
      if (quotaReached) {
        // send email to team owner saying that the team members limit has been reached (background job)
        //* DISABLED for now: we need kind of a way to only send the email one. one possible solution is to store invitation metadata

        // await contactTeamOwner(
        //   {
        //     teamId: invitation.teamId,
        //     message: `The invitation that was sent to ${email} for joining your team has been rejected because the team members limit has been reached. Please upgrade your plan to add more members.`,
        //     subject: 'An invitation to join your team has been rejected',
        //   },
        //   { tx },
        // );

        throw new ApiError(httpStatus.FORBIDDEN, 'Team members limit reached. Please ask the team owner to upgrade the plan to add more members');
      }

      // this condition won't be met because we are checking for existingTeamId above (just for future reference)
      if (invitation.teamId === existingTeamId) {
        if (agentId || addToSpaceRoleId) {
          const agentIdError =
            agentTeamId?.teamId || addToSpaceRoleId ? `ALREADY_PART_OF_TEAM:${agentTeamId?.teamId || addToSpaceRoleId}` : 'ALREADY_PART_OF_TEAM';
          throw new ApiError(httpStatus.FORBIDDEN, agentIdError);
        } else {
          throw new ApiError(httpStatus.FORBIDDEN, 'You are already part of this team');
        }
      }

      const userRole = await tx.userTeamRole.findFirst({
        where: {
          userId,
          sharedTeamRole: {
            teamId: existingTeamId,
          },
        },
        select: {
          isTeamInitiator: true,
        },
      });

      if (userRole?.isTeamInitiator) {
        // try to delete the team (only succeeds if no manual intervention is required)
        const deletedTeam = await implicitlyDeleteParentTeam({
          currentTeamId: existingTeamId,
          userId,
          options: {
            tx,
          },
        });
      } else {
        // try to leave the team (only succeeds if no manual intervention is required)
        const leftTeam = await implicitlyLeaveTeam({
          currentTeamId: existingTeamId,
          userId,
          options: {
            tx,
          },
        });
      }

      let orgRoleId;
      try {
        if (agentTeamId?.teamId) {
          const setting = await getSpaceRoleId(invitation.teamId, 'defaultRole');
          orgRoleId = setting?.settingValue ? JSON.parse(setting?.settingValue)?.defaultRole?.data?.defaultRoles[invitation.teamId]?.id : null;
        }
      } catch (error) {
        orgRoleId = null;
      }
      if (!orgRoleId) {
        if (invitation.teamRoleId) {
          orgRoleId = invitation.teamRoleId;
        } else {
          const orgRoles = await tx.teamRole.findMany({
            where: {
              teamId: invitation.teamId,
            },
          });
          orgRoleId = orgRoles?.find(role => role.name === 'Super Admin')?.id;
        }
      }

      let spaceRoleId;
      try {
        if (agentTeamId?.teamId) {
          const setting = await getSpaceRoleId(agentTeamId?.teamId, 'defaultRole');
          spaceRoleId = setting?.settingValue ? JSON.parse(setting?.settingValue)?.defaultRole?.data?.defaultRoles[agentTeamId?.teamId]?.id : null;
        }
      } catch (error) {
        spaceRoleId = null;
      }
      if (!spaceRoleId) {
        try {
          const setting = await getSpaceRoleId(agentTeamId?.teamId, 'defaultRole');
          spaceRoleId = setting?.settingValue ? JSON.parse(setting?.settingValue)?.defaultRole?.data?.defaultRoles[agentTeamId?.teamId]?.id : null;
        } catch (error) {
          spaceRoleId = null;
        }
        if (!spaceRoleId) {
          const spaceRoles =
            agentTeamId && agentTeamId?.teamId !== invitation.teamId
              ? await tx.teamRole.findMany({
                  where: {
                    teamId: agentTeamId?.teamId,
                  },
                })
              : [];

          spaceRoleId = spaceRoles?.find(role => role.name === 'Super Admin')?.id;
        }
      }

      //* if you called this after the user is connected to the team, make sure that you exclude the user from the list (in case the user is an admin)
      const admins = await getTeamAdmins({ teamId: invitation.teamId, ctx: { tx } });

      const invitee = await tx.user.update({
        where: {
          email,
        },
        data: {
          team: {
            connect: {
              id: invitation.teamId,
            },
          },
        },

        select: {
          name: true,
          email: true,
          id: true,
        },
      });

      // create a new user team role and connect it to the user
      const userTeamRoleUpdated = await tx.userTeamRole.create({
        data: {
          user: {
            connect: {
              id: invitee.id,
            },
          },
          sharedTeamRole: {
            connect: {
              id: agentId || addToSpaceId ? orgRoleId : invitation.teamRoleId,
            },
          },
        },
      });
      if ((agentId && agentTeamId && agentTeamId?.teamId !== invitation.teamId) || addToSpaceRoleId) {
        await teamService.assignMemberToSubTeam({
          member: { id: +invitee.id },
          caller: { id: userId },
          subteamId: addToSpaceRoleId ? addToSpaceId : agentTeamId?.teamId,
          roleId: addToSpaceRoleId || spaceRoleId,
          bypassAccessCheck: true,
          options: { tx },
        });
        retVal.spaceId = addToSpaceRoleId ? addToSpaceId : agentTeamId?.teamId;
      }
      retVal.organizationId = invitation.teamId;

      // mark the invitation as accepted
      await tx.teamInvitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          status: 'ACCEPTED',
        },

        select: null,
      });

      // We don't want to report seats for Smythos users
      await usageReporter
        .handleTeamSeatsUsage({
          teamId: invitation.teamId,
          tx,
          seatAdded: !invitee.email.includes('@smythos.com'),
          meterName: config.variables.STRIPE_V4_SEATS_METER_NAME,
        })
        .catch(err => LOGGER.error(`Error reporting seats`, err));

      // send email to the invitee
      mailService
        .sendTemplateMail({
          template: mailService.templates.successfulTeamJoin,
          to: invitee.email,
          subject: `You've accepted the invitation to join the team`,
          templateData: {
            team: { name: invitation.team.name },
            inviter: { name: invitation.createdBy.name },
            invitee: { name: invitee.name || email },
          },
        })
        .catch(e => LOGGER.error(new Error(`Non-blocking Error sending successful team join email: ${e}`)));

      // send email to the team admin(s)
      mailService
        .sendTemplateMail({
          template: mailService.templates.teamInvitationAccepted,
          to: admins.map(admin => admin.email),
          subject: `${invitee.name || invitee.email} has accepted the invitation to join your team`,
          templateData: {
            team: { name: invitation.team.name },
            invitee: { name: invitee.name },
          },
        })
        .catch(e => LOGGER.error(new Error(`Non-blocking Error sending team invitation accepted email: ${e}`)));

      return retVal;
    },
    { timeout: 3_000_000 }, // can be a bit slow because this might involve deleting data, migration, etc.
  );

  return _user;
};
export const getTeamInvitations = async (teamId: string, userId: number) => {
  await teamService.checkIfCanManageTeamOrThrow(userId, teamId);
  const invitations = await prisma.teamInvitation.findMany({
    where: {
      teamId,
    },
    select: {
      id: true,
      email: true,
      status: true,
      expiresAt: true,
      teamRole: {
        select: {
          id: true,
          name: true,
          isOwnerRole: true,
          canManageTeam: true,
        },
      },
    },
  });

  return invitations;
};

export const deleteTeamInvitation = async (invitationId: number, teamId: string, userId: number) => {
  await teamService.checkIfCanManageTeamOrThrow(userId, teamId);

  const invitation = await prisma.teamInvitation.findFirst({
    where: {
      id: invitationId,
      teamId,
    },
    select: {
      id: true,
      status: true,
      email: true,
    },
  });

  if (!invitation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invitation not found');
  }

  if (invitation.status === 'ACCEPTED') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete accepted invitation');
  }

  await prisma.teamInvitation.delete({
    where: {
      id: invitationId,
    },
  });

  return { success: true };
};
