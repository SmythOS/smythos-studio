import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { updateAgentSettings } from '@react/features/ai-chat/clients';
import { TAgentSetting } from '@react/features/ai-chat/types';
import { AgentSettings } from '@react/shared/types/agent-data.types';

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
    (params: { agentId: string; settings: TAgentSetting }) =>
      updateAgentSettings(params.agentId, params.settings),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['agent_settings', variables.agentId]);
      },
    },
  );
};
