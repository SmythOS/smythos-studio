import { apiResultsTypes } from '@react/shared/types';
import { TEAM_ID_HEADER } from '@src/backend/constants';
import { TeamSubs } from '@src/react/shared/types/subscription';

export const getTeamRoles = async (
  teamId?: string,
): Promise<{ roles: apiResultsTypes.TeamRoleWithMembers[] }> => {
  const result = await fetch('/api/page/teams/roles', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...(teamId && { [TEAM_ID_HEADER]: teamId }) },
  });
  return result.json();
};

type GetTeamMembersResponse = { members: apiResultsTypes.TeamMemberWithRole[] };
export const getTeamMembers = async (teamId?: string): Promise<GetTeamMembersResponse> => {
  const result = await fetch('/api/page/teams/members?includeRoles=true', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...(teamId && { [TEAM_ID_HEADER]: teamId }) },
  });
  return result.json();
};

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
