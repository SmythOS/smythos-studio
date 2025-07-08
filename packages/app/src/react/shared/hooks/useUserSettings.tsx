import { useMutation } from '@tanstack/react-query';

import { useCustomSuspenseQuery } from '@react/shared/query-client';
import { TEAM_ID_HEADER } from '@src/backend/constants';

export const getUserSettings = async (key: string) => {
  const response = await fetch(`/api/app/user-settings/${key}`);
  if (!response.ok) throw new Error('Failed to get user settings');
  return response.json();
};

export const saveUserSettings = async (key: string, value: string, headerTeamId?: string) => {
  const response = await fetch(`/api/app/user-settings/${key}`, {
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

export const useStoreUserSettings = (key: string) => {
  return useMutation({ mutationFn: (value: string) => saveUserSettings(key, value) });
};

export const useGetUserSettings = (key: string) => {
  return useCustomSuspenseQuery(['userSettings', key], () => getUserSettings(key));
};
