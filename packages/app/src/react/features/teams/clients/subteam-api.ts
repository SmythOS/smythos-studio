import { apiResultsTypes } from '@react/shared/types';
import { authStore } from '@shared/state_stores/auth/store';
import { TEAM_ID_HEADER } from '@src/backend/constants';

export const createSubTeam = ({ name, parentTeamId }: { name: string; parentTeamId: string }) =>
  fetch('/app/page/teams/subteams', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(parentTeamId && { [TEAM_ID_HEADER]: parentTeamId }),
    },
    body: JSON.stringify({ name }),
  });
export const updateSubTeam = async (data: { id: string; name: string }) => {
  const response = await fetch(`/app/page/teams/${data.id}/name/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(data.id && { [TEAM_ID_HEADER]: data.id }) },
    body: JSON.stringify({ name: data.name }),
  });

  if (response.ok) authStore.getState().updateUserTeam(data.id, { name: data.name });

  return response;
};
export const deleteSubTeam = (data: { id: string; userId: number; parentId: string }) =>
  fetch(`/app/page/teams/subteams/${data.id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const getSubTeams = async (): Promise<{ roles: apiResultsTypes.TeamRoleWithMembers[] }> => {
  const result = await fetch('/app/page/teams/me');
  return result.json();
};

interface GetTeamRolesResponse {
  roles: apiResultsTypes.TeamRoleWithMembers[];
  members: apiResultsTypes.TeamMemberWithRole[];
}

export const getTeamRoles = async (teamId: string): Promise<GetTeamRolesResponse> => {
  const result = await fetch('/app/page/teams/roles', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...(teamId && { [TEAM_ID_HEADER]: teamId }) },
  });
  return result.json();
};

interface GetTeamMembersResponse {
  members: apiResultsTypes.TeamMemberWithRole[];
}
export const getTeamMembers = async (teamId: string): Promise<GetTeamMembersResponse> => {
  const result = await fetch('/app/page/teams/members?includeRoles=true', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...(teamId && { [TEAM_ID_HEADER]: teamId }) },
  });
  return result.json();
};

interface DataCommon {
  teamId: string;
  memberId: string;
}

interface AssignMemberToTeamData extends DataCommon {
  roleId: string;
  notifyEmail?: boolean;
}
export const assignMemberToTeam = async (data: AssignMemberToTeamData) => {
  const result = await fetch(`/api/page/teams/${data.teamId}/members/assign/${data.memberId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(data.teamId && { [TEAM_ID_HEADER]: data.teamId }),
    },
    body: JSON.stringify({ roleId: data.roleId, notifyEmail: data.notifyEmail || false }),
  });
  return result.json();
};

interface UnassignMemberFromTeamData extends DataCommon {
  roleId: number;
}
export const unassignMemberFromTeam = async (data: UnassignMemberFromTeamData) => {
  const result = await fetch(`/api/page/teams/${data.teamId}/members/unassign/${data.memberId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(data.teamId && { [TEAM_ID_HEADER]: data.teamId }),
    },
    body: JSON.stringify({ memberId: data.memberId, subteamId: data.teamId }),
  });
  return result.json();
};
