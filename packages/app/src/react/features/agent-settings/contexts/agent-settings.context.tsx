import { getAgent } from '@react/features/agent-settings/clients';
import { getAgentAuthData } from '@react/features/agent-settings/clients/agent-auth';
import { teamAPI } from '@react/features/teams/clients';
import { Agent } from '@react/shared/types/agent-data.types';
import {
  Deployment,
  DeploymentWithAgentSnapshot,
  TeamRoleWithMembers,
} from '@react/shared/types/api-results.types';
import { useQuery } from '@tanstack/react-query';
import { createContext, FC, ReactNode, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { useAgentSettings } from '@react/features/ai-chat/hooks/agent-settings';
import { Workspace } from '@src/builder-ui/workspace/Workspace.class';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { PageACL } from '@src/shared/state_stores/auth';

declare const workspace: Workspace;

// Add this type declaration to extend the Window interface
declare global {
  interface Window {
    refetchSettingsSidebarData: () => Promise<void>;
  }
}

type ServerStatus = {
  baseUrl: string;
  frontUrl: string;
  debugUrl: string;
  docUrl: string;
  dbgUrl: string;
  agent_domain: string;
  env: string;
  status: string;
  prod_agent_domain: string;
  user: unknown;
  userData: unknown;
};

interface AgentSettingsContextType {
  workspace?: Workspace;
  agentQuery: ReturnType<typeof useQuery<Agent>> | null;
  teamRolesQuery: ReturnType<
    typeof useQuery<{
      roles: TeamRoleWithMembers[];
    }>
  > | null;
  agentId: string;
  settingsQuery: ReturnType<typeof useQuery<{ settings: { [key: string]: string } }>> | null;
  agentTestDomainQuery: ReturnType<typeof useQuery<string>> | null;
  latestAgentDeploymentQuery: ReturnType<
    typeof useQuery<{ deployment: DeploymentWithAgentSnapshot }>
  > | null;
  allDeploymentsQuery: ReturnType<typeof useQuery<{ deployments: Deployment[] }>> | null;
  serverStatusQuery: ReturnType<typeof useQuery<ServerStatus>> | null;
  serverStatusData: ServerStatus | null;
  refetchAllData: () => Promise<void>;
  agentAuthData: Record<string, string> | null;
  pageAccess: PageACL;
}

const initialState: AgentSettingsContextType = {
  agentQuery: null,
  teamRolesQuery: null,
  agentId: '',
  agentTestDomainQuery: null,
  latestAgentDeploymentQuery: null,
  settingsQuery: null,
  allDeploymentsQuery: null,
  refetchAllData: async () => {},
  serverStatusQuery: null,
  serverStatusData: null,
  agentAuthData: null,
  pageAccess: { read: false, write: false },
};

const AgentSettingsContext = createContext<AgentSettingsContextType | null>(null);

interface AgentSettingsProviderProps {
  children: ReactNode;
  workspace?: Workspace;
  workspaceAgentId?: string;
}

export const AgentSettingsProvider: FC<AgentSettingsProviderProps> = ({
  children,
  workspaceAgentId,
  workspace,
}) => {
  const [workSpaceObj, setWorkSpaceObj] = useState<Workspace | null>(workspace || null);
  const [agentAuthData, setAgentAuthData] = useState<any>(null);

  const { getPageAccess } = useAuthCtx();

  const pageAccess = getPageAccess('/agent-settings', false);

  // Always call useParams to avoid violating Rules of Hooks
  const params = useParams<{ agentId: string }>();

  // Fallback: extract agentId from URL if useParams fails
  let extractedAgentId = params.agentId;
  if (!extractedAgentId) {
    const pathname = window.location.pathname;
    const match = pathname.match(/\/agent-settings\/([^\/]+)/);
    extractedAgentId = match ? match[1] : undefined;
  }

  // Use workspaceAgentId if provided, otherwise use extracted agentId
  const agentId = workspaceAgentId || extractedAgentId;

  function updateWorkSpaceObj() {
    setWorkSpaceObj(window['workspace']);
  }
  // To avoid any UI updating issues, we call the loadAgentAuthData function immediately after updateWorkspaceObj() function, since we stored the auth data in agent data under workspace.agent.data before, now we only keep the 'method' prop in workspace.agent.data
  async function loadAgentAuthData() {
    try {
      const authData = await getAgentAuthData(agentId);

      setAgentAuthData(authData);
    } catch (error) {
      console.error('Error getting agent auth data');
    }
  }

  async function agentDeployed() {
    await allDeploymentsQuery.refetch();
    updateWorkSpaceObj();
    loadAgentAuthData();
  }
  async function componentUpdated() {
    await serverStatusQuery.refetch();
    updateWorkSpaceObj();
    loadAgentAuthData();
  }

  // Add this function to handle agent updates
  async function agentUpdated() {
    await refetchAllData();
    updateWorkSpaceObj();
    loadAgentAuthData();
  }

  async function onAgentSaved() {
    updateWorkSpaceObj();
    loadAgentAuthData();
  }

  useEffect(() => {
    if (workspace) {
      workspace.on('AgentSaved', onAgentSaved);
      workspace.on('AgentDeployed', agentDeployed);
      workspace.on('componentUpdated', componentUpdated);
      // Add this line to listen for the agentUpdated event
      workspace.on('agentUpdated', agentUpdated);

      // Cleanup subscription on unmount
      return () => {
        workspace.off('AgentSaved', onAgentSaved);
        workspace.off('AgentDeployed', agentDeployed);
        workspace.off('componentUpdated', componentUpdated);
        // Add this line to remove the listener
        workspace.off('agentUpdated', agentUpdated);
      };
    }
  }, [workspace]);

  // Add an effect to load auth data when the component mounts or when agentId changes
  useEffect(() => {
    if (agentId) {
      loadAgentAuthData();
    }
  }, [agentId]);

  const agentQuery = useQuery({
    queryKey: ['agent_data_settings'],
    queryFn: () => getAgent(agentId),
    cacheTime: 0,
    staleTime: 0,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: false,
  });

  const teamRolesQuery = useQuery({
    queryKey: ['team_roles_settings'],
    queryFn: () => teamAPI.getTeamRoles(),
    cacheTime: 0,
    staleTime: 0,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  const agentTestDomainQuery = useQuery({
    queryKey: ['agents_domain'],
    queryFn: () =>
      fetch('/api/status')
        .then((res) => res.json())
        .then((data) => {
          return data?.status?.agent_domain ? `${agentId}.${data?.status?.agent_domain}` : null;
        }),
    cacheTime: 0,
    staleTime: 0,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    retry: false,
  });

  const latestAgentDeploymentQuery = useQuery({
    queryKey: ['latest_deployment', agentId],
    queryFn: () =>
      fetch(`/api/page/agent_settings/ai-agent/${agentId}/deployments/latest`).then(
        (res) => res.json() as Promise<{ deployment: DeploymentWithAgentSnapshot }>,
      ),
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const serverStatusQuery = useQuery<ServerStatus>({
    queryKey: ['serverStatus'],
    queryFn: async () => {
      const response = await fetch('/api/status');
      const result = await response.json();

      return {
        baseUrl: result.status.url,
        frontUrl: result.status.frontUrl,
        debugUrl: `${result.status.url}/api`,
        docUrl: result.status.doc_url,
        dbgUrl: result.status.dbg_url,
        agent_domain: result.status.agent_domain,
        env: result.status.env,
        status: result.status.server,
        prod_agent_domain: result.status.prod_agent_domain,
        user: result.status.user,
        userData: result.status.user,
      };
    },
  });
  const allDeploymentsQuery = useQuery({
    queryKey: ['all_deployments', agentId],
    queryFn: () =>
      fetch(`/api/page/builder/ai-agent/${agentId}/deployments`).then(
        (res) => res.json() as Promise<{ deployments: Deployment[] }>,
      ),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const settingsQuery = useAgentSettings(agentId);

  /**
   * Refetches all query data in the context
   * Returns a promise that resolves when all refetch operations are complete
   */
  const refetchAllData = async (): Promise<void> => {
    const queries = [
      agentQuery,
      settingsQuery,
      teamRolesQuery,
      agentTestDomainQuery,
      latestAgentDeploymentQuery,
      allDeploymentsQuery,
      serverStatusQuery,
    ].filter((query): query is NonNullable<typeof query> => query !== null);

    await Promise.all(queries.map((query) => query.refetch()));
  };

  // Attach the refetch function to window when the component mounts
  useEffect(() => {
    window.refetchSettingsSidebarData = refetchAllData;

    // Cleanup when component unmounts
    return () => {
      delete window.refetchSettingsSidebarData;
    };
  }, [refetchAllData]);

  return (
    <AgentSettingsContext.Provider
      value={{
        agentQuery,
        settingsQuery,
        teamRolesQuery,
        agentId,
        agentTestDomainQuery,
        latestAgentDeploymentQuery,
        allDeploymentsQuery,
        workspace: workSpaceObj,
        serverStatusQuery,
        serverStatusData: serverStatusQuery.data,
        refetchAllData,
        agentAuthData,
        pageAccess,
      }}
    >
      {children}
    </AgentSettingsContext.Provider>
  );
};

// 5. Custom useContext hook
export const useAgentSettingsCtx = (): AgentSettingsContextType => {
  const context = useContext(AgentSettingsContext);
  if (!context) {
    throw new Error('useAgentSettings must be used within an AgentSettingsProvider');
  }
  return context;
};
