/*
=============   Hook usage   ===============
const { data, error, isLoading, refetch, invalidate, setData  } = useAgentSettings(agentId, {
        refetchOnWindowFocus: false,
        You can pass all the options supported by useQuery here
});
*/

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteAgentSettings, updateAgentSettings } from '@react/features/ai-chat/clients';
import { AgentSettings } from '@src/react/shared/types/agent-data.types';

export const useAgentSettings = (agentId: string) => {
  const queryResult = useQuery({
    queryKey: ['agent_settings', agentId],
    queryFn: () =>
      fetch(`/api/page/agent_settings/ai-agent/${agentId}/settings`)
        .then((res) => res.json())
        .then((data) => {
          return {
            settings: data.settings?.reduce(
              (acc, setting) => ({ ...acc, [setting.key]: setting.value }),
              {},
            ),
          };
        }) as Promise<{ settings: AgentSettings }>,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    cacheTime: 0,
  });

  return queryResult;
};

export const useUpdateAgentSettingsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (params: { agentId: string; settings: { key: string; value: string } }) =>
      updateAgentSettings(params.agentId, params.settings),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['agent_settings', variables.agentId]);
      },
    },
  );
};

export const useDeleteAgentSettingsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation(
    (params: { agentId: string; key: string }) => deleteAgentSettings(params.agentId, params.key),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['agent_settings', variables.agentId]);
      },
    },
  );
};
