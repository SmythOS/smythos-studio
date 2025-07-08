/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import { useMutation } from '@tanstack/react-query';

import { useCustomSuspenseQuery } from '@react/shared/query-client';
import { TEAM_ID_HEADER } from '@src/backend/constants';

const getTeamSettings = async (key: string, headerTeamId?: string) => {
  try {
    const response = await fetch(`/api/app/team-settings/${key}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(headerTeamId ? { [TEAM_ID_HEADER]: headerTeamId } : {}),
      },
    });
    if (!response.ok) throw new Error('Failed to get user settings');
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching team settings:', error);
    throw error;
  }
};

const saveTeamSettings = async (key: string, value: object, headerTeamId?: string) => {
  const response = await fetch(`/api/app/team-settings/${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(headerTeamId ? { [TEAM_ID_HEADER]: headerTeamId } : {}),
    },
    body: JSON.stringify({ value }),
  });
  if (!response.ok) throw new Error('Failed to save user settings');
  return response.json();
};

export const useStoreTeamSettings = (key: string, headerTeamId?: string) => {
  return useMutation({ mutationFn: (value: object) => saveTeamSettings(key, value, headerTeamId) });
};

export const useGetTeamSettings = (key: string, headerTeamId?: string) => {
  return useCustomSuspenseQuery(['teamSettings', key], () => getTeamSettings(key, headerTeamId));
};
