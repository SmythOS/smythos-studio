/* 
=============   Hook usage   ===============
const { data, error, isLoading, refetch, invalidate, setData  } = useAgent(agentId, {
        refetchOnWindowFocus: false,
        You can pass all the options supported by useQuery here
});
*/

import { AgentDetails } from '@react/shared/types/agent-data.types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const getAgent = async (agentId: string): Promise<AgentDetails> => {
  const res = await fetch(`/api/agent/${agentId}`);
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  const { agent } = await res.json();
  return agent;
};

export const useAgent = (agentId: string, options = {}) => {
  const queryClient = useQueryClient();

  const queryResult = useQuery({
    queryKey: ['agent_data', agentId],
    queryFn: () => getAgent(agentId),
    enabled: !!agentId, // Only fetch if agentId is provided
    ...options, // Additional options for useQuery
  });

  // Refetch the query manually
  const refetch = queryResult.refetch;

  // Invalidate the query to force a refetch
  const invalidate = () => queryClient.invalidateQueries(['agent_data', agentId]);

  // Set new data for the query
  const setData = (newData) => queryClient.setQueryData(['agent_data', agentId], newData);

  return {
    ...queryResult, // Include all returned data and methods from useQuery
    refetch,
    invalidate,
    setData,
  };
};
