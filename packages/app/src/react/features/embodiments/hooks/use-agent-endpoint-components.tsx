import { useAgent } from '@src/react/shared/hooks/agent';

/**
 * Simple hook to get agent endpoint components data
 * Uses workspace if available, otherwise falls back to API
 */
export const useAgentEndpointComponents = (agentId?: string) => {
  // Try to get data from workspace first (builder context)
  const workspaceData = window.workspace?.agent?.data;

  // Fallback to API if no workspace data and agentId provided
  const { data: apiData, isLoading } = useAgent(agentId || '', {
    enabled: !!agentId && !workspaceData,
    refetchOnWindowFocus: false,
  });

  // Use workspace data if available, otherwise use API data
  const agentData = workspaceData || apiData?.data;
  return {
    components:
      agentData?.components?.filter(
        (component: any) =>
          component.inputs && component.inputs.length > 0 && component.data?.endpoint,
      ) || [],
    isLoading: !workspaceData && isLoading,
  };
};
