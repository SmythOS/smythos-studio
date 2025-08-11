import { apiPayloadTypes, apiResultsTypes } from '@react/shared/types';
import { TEAM_ID_HEADER } from '@src/backend/constants';
import { TeamSubs } from '@src/react/shared/types/subscription';

export const createTeamRole = (data: apiPayloadTypes.CreateRoleRequest) =>
  fetch('/api/page/teams/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// USED
export const getTeamRoles = async (): Promise<{ roles: apiResultsTypes.TeamRoleWithMembers[] }> => {
  const result = await fetch('/app/page/teams/roles');
  const response = await result.json();
  return { roles: response?.roles };
};

export const deleteTeamRole = (roleId: string) =>
  fetch(`/api/page/teams/roles/${roleId}`, { method: 'DELETE' });

export const updateTeamRole = (data: apiPayloadTypes.UpdateRoleRequest) =>
  fetch('/api/page/teams/roles', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

type GetTeamMembersResponse = { members: apiResultsTypes.TeamMemberWithRole[] };
// USED
export const getTeamMembers = async (): Promise<GetTeamMembersResponse> => {
  const result = await fetch('/app/page/teams/members?includeRoles=true');
  return result.json();
};

type GetInvitationsResponse = { members: apiResultsTypes.Invitation[] };
export const getInvitations = async (): Promise<GetInvitationsResponse> => {
  const result = await fetch('/app/page/teams/invitations');
  return result.json();
};

export const inviteTeamMember = (data: apiPayloadTypes.InviteTeamMemberRequest) =>
  fetch('/api/page/teams/invitations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const inviteTeamMemberWithSubTeam = (
  data: apiPayloadTypes.InviteTeamMemberWithSubteamRequest,
  headerTeamId?: string,
) =>
  fetch('/app/page/teams/invitations/with-subteam', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(headerTeamId && { [TEAM_ID_HEADER]: headerTeamId }),
    },
    body: JSON.stringify(data),
  });
export const shareAgentWithTeamMember = (data: apiPayloadTypes.ShareAgentWithTeamMemberRequest) =>
  fetch('/api/page/teams/share-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateTeamMemberRole = (
  memberId: number,
  data: apiPayloadTypes.UpdateTeamMemberRoleRequest,
) =>
  fetch(`/api/page/teams/members/${memberId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const leaveTeam = () =>
  fetch('/api/page/teams/me/leave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

export const deleteTeamMember = (memberId: number) =>
  fetch(`/api/page/teams/members/${memberId}`, { method: 'DELETE' });

export const acceptInvitation = (
  invitationId: string,
  agentId?: string,
  spaceId?: string,
  spaceRoleId?: string,
) =>
  fetch(`/api/page/teams/invitations/${invitationId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(agentId && { body: JSON.stringify({ agentId }) }),
    ...(spaceId &&
      spaceRoleId && {
        body: JSON.stringify({ addToSpaceId: spaceId, addToSpaceRoleId: spaceRoleId }),
      }),
  });

export const getUserTeamMembers = async (teamId: string) => {
  const res = await getTeamMembers();
  return res.members;
};

export const getTeamSubs = async () => {
  const res = await fetch('/api/page/user/me/subscription');
  const json = await res.json();
  return json?.teamsSubs as TeamSubs;
};

//This is the function that we should rely on moving forward it does not have backward compatibility for friendly name
// Before using this function make sure you do not need friendly name
export const getProperTeamSubs = async () => {
  const res = await fetch('/api/page/teams/me');
  const json = await res.json();
  return json?.team;
};
