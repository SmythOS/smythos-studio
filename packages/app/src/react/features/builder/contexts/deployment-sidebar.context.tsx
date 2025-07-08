import { Workspace } from '@src/builder-ui/workspace/Workspace.class';
import { queryClient } from '@src/react/shared/query-client';
import { Deployment, Domain } from '@src/react/shared/types/api-results.types';
import { UseMutationResult, UseQueryResult, useMutation, useQuery } from '@tanstack/react-query';
import { FC, ReactNode, createContext, useContext, useEffect, useState } from 'react';

declare const workspace: Workspace;

interface DeploymentSidebarContextType {
  deployMutation?: UseMutationResult<any, unknown, any, unknown> | undefined;
  latestDeployment?: UseQueryResult<{ deployment: Deployment }> | undefined;
  allDeployments?: UseQueryResult<{ deployments: Deployment[] }> | undefined;
  domains?: UseQueryResult<Domain[]> | undefined;
  ALL_DEPLOYMENTS_QUERY_KEY: string[] | undefined;
  workspace?: Workspace;
  updateVersion?: (major?: number, minor?: number) => void;
  lastVersion: { major: number; minor: number };
  statusInfoQuery?:
    | UseQueryResult<{
        status: {
          prod_agent_domain: string;
        };
      }>
    | undefined;
}

const initialState: DeploymentSidebarContextType = {
  deployMutation: undefined,
  latestDeployment: undefined,
  allDeployments: undefined,
  domains: undefined,
  ALL_DEPLOYMENTS_QUERY_KEY: undefined,
  workspace: undefined,
  updateVersion: undefined,
  lastVersion: { major: 1, minor: 0 },
  statusInfoQuery: undefined,
};

const DeploymentSidebarContext = createContext<DeploymentSidebarContextType | null>(null);

interface DeploymentSidebarProviderProps {
  children: ReactNode;
  workspace: Workspace;
}

export const DeploymentSidebarProvider: FC<DeploymentSidebarProviderProps> = ({ children }) => {
  const ALL_DEPLOYMENTS_QUERY_KEY = ['all-deployments', workspace.agent.id];
  const [lastMajorVersion, setLastMajorVersion] = useState<number | null>(null);
  const [lastMinorVersion, setLastMinorVersion] = useState<number | null>(null);

  const deployMutation = useMutation({
    mutationKey: ['deploy-agent', workspace.agent.id],
    mutationFn: async (values: {
      title: string;
      major: number;
      minor: number;
      domain: string;
      releaseNotes: string;
    }) => {
      const response = await fetch(`/api/page/builder/ai-agent/deployments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          releaseNotes: `${values.releaseNotes || ' '}`,
          version: `${values.major}.${values.minor}`,
          agentId: workspace.agent.id,
        }),
      });

      const responseClone = response.clone();
      const data = await responseClone.json();

      queryClient.setQueryData(
        ALL_DEPLOYMENTS_QUERY_KEY,
        (oldData: { deployments: Deployment[] }) => {
          return {
            deployments: [
              {
                createdAt: new Date().toISOString(),
                majorVersion: values.major,
                minorVersion: values.minor,
                version: `${values.major}.${values.minor}`,
                releaseNotes: `${values.releaseNotes || ' '}`,
                aiAgentId: workspace.agent.id,
                aiAgent: {
                  name: workspace.agent.name,
                },
                id: data?.deployment?.id || Math.random().toString(36).substring(7),
              },
              ...oldData.deployments,
            ],
          };
        },
      );

      updateLatestVersion(values.major, values.minor);

      return response;
    },
  });

  const latestDeployment = useQuery({
    queryKey: ['latest-deployment', workspace.agent.id],
    queryFn: () =>
      fetch(`/api/page/builder/ai-agent/${workspace.agent.id}/deployments/latest`).then((res) =>
        res.json(),
      ),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const domains = useQuery({
    queryKey: ['domains', workspace.agent.id],
    queryFn: () => fetch(`/api/page/builder/domains`).then((res) => res.json()),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const allDeployments = useQuery({
    queryKey: ALL_DEPLOYMENTS_QUERY_KEY,
    queryFn: () =>
      fetch(`/api/page/builder/ai-agent/${workspace.agent.id}/deployments`).then(
        (res) => res.json() as Promise<{ deployments: Deployment[] }>,
      ),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const statusInfoQuery = useQuery({
    queryKey: ['status-info', workspace.agent.id],
    queryFn: () => fetch(`/api/status`).then((res) => res.json()),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (latestDeployment.data?.deployment) {
      setLastMajorVersion(latestDeployment.data.deployment?.majorVersion);
      setLastMinorVersion(latestDeployment.data.deployment?.minorVersion);
    }
  }, [latestDeployment.data]);

  function updateLatestVersion(major?: number, minor?: number) {
    if (major !== undefined) {
      setLastMajorVersion(major);
    }
    if (minor !== undefined) {
      setLastMinorVersion(minor);
    }
  }

  return (
    <DeploymentSidebarContext.Provider
      value={{
        deployMutation,
        latestDeployment,
        allDeployments,
        domains,
        ALL_DEPLOYMENTS_QUERY_KEY,
        workspace,
        updateVersion: updateLatestVersion,
        lastVersion: { major: lastMajorVersion, minor: lastMinorVersion },
        statusInfoQuery,
      }}
    >
      {children}
    </DeploymentSidebarContext.Provider>
  );
};

// 5. Custom useContext hook
export const useDeploymentSidebarCtx = (): DeploymentSidebarContextType => {
  const context = useContext(DeploymentSidebarContext);
  if (!context) {
    throw new Error('useDeploymentSidebar must be used within an DeploymentSidebarProvider');
  }
  return context;
};
