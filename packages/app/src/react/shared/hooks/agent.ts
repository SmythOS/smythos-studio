/* 
=============   Hook usage   ===============
const { data, error, isLoading, refetch, invalidate, setData  } = useAgent(agentId, {
        refetchOnWindowFocus: false,
        You can pass all the options supported by useQuery here
});
*/

import { Agent } from '@react/shared/types/agent-data.types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface AgentResponse {
  success: boolean;
  agent: Agent;
}

interface CreateAgentResponse {
  id: string;
  name: string;
  success: boolean;
}

const getAgent = async (agentId: string) => {
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

export const useAgentMutations = () => {
  const queryClient = useQueryClient();

  const createAgent = async (agentData: {
    name: string;
    behavior?: string;
    description?: string;
    domain?: string[];
    data?: any;
  }): Promise<CreateAgentResponse> => {
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentData),
    });

    if (!response.ok) {
      throw new Error('Failed to create agent');
    }

    const data = await response.json();
    await queryClient.invalidateQueries(['agents']); // Invalidate agents list
    return data;
  };

  const saveAgent = async (agentId: string, agentData: Partial<Agent>): Promise<AgentResponse> => {
    const response = await fetch(`/api/agent/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agentData),
    });

    if (!response.ok) {
      throw new Error('Failed to save agent');
    }

    const data = await response.json();
    await queryClient.invalidateQueries(['agent_data', agentId]); // Invalidate specific agent data
    await queryClient.invalidateQueries(['agents']); // Invalidate agents list
    return data.agent;
  };

  return {
    createAgent,
    saveAgent,
  };
};
