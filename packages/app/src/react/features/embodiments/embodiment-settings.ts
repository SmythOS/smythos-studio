import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Agent as AgentInstance } from '../../../builder-ui/Agent.class';
import config from '../../../builder-ui/config';
import { Observability } from '../../../shared/observability';
import { EVENTS } from '../../../shared/posthog/constants/events';
import { useAuthCtx } from '../../shared/contexts/auth.context';
import { Embodiment } from '../../shared/types/api-results.types';
import { updateEmbodiment } from '../agent-settings/clients';
import { useAgentSettingsCtx } from '../agent-settings/contexts/agent-settings.context';
import {
  getAvailableEmbodiments,
  structureAgentSetting,
  useAgentEmbodiments,
  useAgentSettings,
} from './embodiment-helper';

type AgentSetting = {
  key: string;
  value: string;
  enabled: boolean;
  isUpdating: boolean;
  embIcon?: JSX.Element;
  embTitle?: string;
  embDescription?: string;
  codeSnippetVisible?: boolean;
  configurationVisible?: boolean;
  openModal?: () => void;
  openCodeSnippet?: () => void;
  dialogComponent?: JSX.Element;
  codeSnippetComponent?: JSX.Element;
};

type UseAgentEmbodimentSettingsCallback = (
  agentSettings: AgentSetting[],
  embodimentsData: Embodiment[],
  availableEmbodiments: string[],
  canUseEmbodiments: boolean,
  isReadOnlyAccess: boolean,
) => void;

// Global state for modal management to prevent multiple instances
const globalModalManager = {
  activeAgentId: null as string | null,
  activeInstanceId: null as string | null,
  activeModal: null as string | null,
  showCodeSnippet: false,
  activeCodeSnippetKey: null as string | null,
  subscribers: new Set<string>(),

  registerInstance: (instanceId: string, agentId: string) => {
    globalModalManager.subscribers.add(instanceId);
    // If no active instance, set this as active
    if (!globalModalManager.activeInstanceId) {
      globalModalManager.activeInstanceId = instanceId;
      globalModalManager.activeAgentId = agentId;
    }
  },

  unregisterInstance: (instanceId: string) => {
    globalModalManager.subscribers.delete(instanceId);
    // If this was the active instance, clear it
    if (globalModalManager.activeInstanceId === instanceId) {
      globalModalManager.activeInstanceId = null;
      globalModalManager.activeAgentId = null;
      globalModalManager.activeModal = null;
      globalModalManager.showCodeSnippet = false;
      globalModalManager.activeCodeSnippetKey = null;
    }
  },

  setActiveModal: (instanceId: string, agentId: string, modalType: string | null) => {
    if (modalType) {
      globalModalManager.activeInstanceId = instanceId;
      globalModalManager.activeAgentId = agentId;
      globalModalManager.activeModal = modalType;
    } else {
      globalModalManager.activeModal = null;
    }
    // Notify components of modal state change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('embodimentModalStateChange'));
    }
  },

  setCodeSnippet: (instanceId: string, agentId: string, show: boolean, key: string) => {
    if (show) {
      globalModalManager.activeInstanceId = instanceId;
      globalModalManager.activeAgentId = agentId;
      globalModalManager.showCodeSnippet = true;
      globalModalManager.activeCodeSnippetKey = key;
    } else {
      globalModalManager.showCodeSnippet = false;
      globalModalManager.activeCodeSnippetKey = null;
    }
    // Notify components of modal state change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('embodimentModalStateChange'));
    }
  },

  isActiveInstance: (instanceId: string) => {
    return globalModalManager.activeInstanceId === instanceId;
  },
};

// Export the global modal manager for direct access
export { globalModalManager };

const uiServer = config.env.UI_SERVER;
const agentInstance = new AgentInstance(uiServer);

/**
 * Custom React hook for managing agent embodiment settings with React Query caching
 * @param agentId - The agent ID to fetch settings for
 * @param callback - Optional callback function called when agent settings change
 * @param instanceId - Unique identifier for this hook instance (optional, generated if not provided)
 * @returns Object containing loading state, update function, refetch function, and modal handlers
 */
export const useAgentEmbodimentSettings = (
  agentId: string,
  callback?: UseAgentEmbodimentSettingsCallback,
  instanceId?: string,
) => {
  const queryClient = useQueryClient();

  // Generate unique instance ID if not provided
  const hookInstanceId =
    instanceId || `embodiment-settings-${agentId}-${Math.random().toString(36).substr(2, 9)}`;

  // Local state for this instance
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [activeCodeSnippetKey, setActiveCodeSnippetKey] = useState<string | null>(null);

  const { hasReadOnlyPageAccess, userInfo, loading: userInfoLoading } = useAuthCtx();
  const planProperties = userInfo?.subs?.plan?.properties;
  const isReadOnlyAccess = hasReadOnlyPageAccess('/agents');
  const canUseEmbodiments = planProperties?.flags?.embodimentsEnabled;

  const { agentQuery, allDeploymentsQuery, latestAgentDeploymentQuery } = useAgentSettingsCtx();
  const agentDeployed = latestAgentDeploymentQuery?.data?.deployment;

  // Register this instance with global modal manager
  useEffect(() => {
    globalModalManager.registerInstance(hookInstanceId, agentId);

    return () => {
      globalModalManager.unregisterInstance(hookInstanceId);
    };
  }, [hookInstanceId, agentId]);

  // Sync local state with global state
  useEffect(() => {
    if (globalModalManager.isActiveInstance(hookInstanceId)) {
      setActiveModal(globalModalManager.activeModal);
      setShowCodeSnippet(globalModalManager.showCodeSnippet);
      setActiveCodeSnippetKey(globalModalManager.activeCodeSnippetKey);
    } else {
      setActiveModal(null);
      setShowCodeSnippet(false);
      setActiveCodeSnippetKey(null);
    }
  }, [hookInstanceId]);

  // Modal handlers that update both local and global state
  const openModal = (modalType: string) => {
    globalModalManager.setActiveModal(hookInstanceId, agentId, modalType);
    setActiveModal(modalType);
  };

  const closeModal = () => {
    globalModalManager.setActiveModal(hookInstanceId, agentId, null);
    setActiveModal(null);
  };

  const openCodeSnippet = (key: string) => {
    globalModalManager.setCodeSnippet(hookInstanceId, agentId, true, key);
    setShowCodeSnippet(true);
    setActiveCodeSnippetKey(key);
  };

  const closeCodeSnippet = () => {
    globalModalManager.setCodeSnippet(hookInstanceId, agentId, false, null);
    setShowCodeSnippet(false);
    setActiveCodeSnippetKey(null);
  };

  // Use React Query helper for agent embodiments first
  const {
    data: embodimentsData = [],
    isLoading: embodimentsLoading,
    refetch: refetchEmbodiments,
  } = useAgentEmbodiments(agentId, callCallback);

  // Create modal handlers with fresh data
  const modalHandlers = {
    activeModal,
    openModal,
    closeModal,
    showCodeSnippet,
    openCodeSnippet,
    closeCodeSnippet,
    activeCodeSnippetKey,
    agent: agentQuery?.data,
    embodimentsData,
    refreshEmbodiments: () => refetchEmbodiments(),
    isActiveInstance: globalModalManager.isActiveInstance(hookInstanceId),
    instanceId: hookInstanceId,
  };

  // Use React Query helper for agent settings
  const {
    data: agentSettings = [],
    isLoading: agentSettingsLoading,
    refetch: refetchAgentSettings,
  } = useAgentSettings(
    agentId,
    {
      canUseEmbodiments,
      isReadOnlyAccess,
      agentId,
      agentDeployed,
    },
    callCallback,
    modalHandlers,
  );

  // Update agent settings with modal handlers whenever dependencies change
  useEffect(() => {
    if (agentSettings.length > 0) {
      const updatedSettings = agentSettings.map((setting) => {
        // For MCP settings, if the value is already an object, stringify it
        // If it's already a string, use it as is
        let valueToPass: string;
        if (setting.key === 'mcp') {
          valueToPass =
            typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value);
        } else {
          valueToPass = setting.value.toString();
        }

        return structureAgentSetting(
          setting.key,
          valueToPass,
          setting.isUpdating,
          {
            agentId,
            canUseEmbodiments,
            isReadOnlyAccess,
            agentDeployed,
          },
          modalHandlers,
        );
      });

      // Update the cache with the new settings
      queryClient.setQueryData(['agentSettings', agentId], updatedSettings);
      callCallback();
    }
  }, [activeModal, showCodeSnippet, activeCodeSnippetKey, embodimentsData, agentQuery?.data]);

  const { data: availableEmbodiments = [] } = useQuery({
    queryKey: ['availableEmbodiments', agentId],
    queryFn: async () => {
      const availableEmbodiments = await getAvailableEmbodiments(agentInstance, agentId);
      return availableEmbodiments;
    },
  });

  const updateAgentSettingsCache = (key: string, value: string, isUpdating: boolean) => {
    // Update agent settings cache directly
    queryClient.setQueryData(['agentSettings', agentId], (oldData: AgentSetting[] = []) => {
      const existingSettingIndex = oldData.findIndex((setting) => setting.key === key);

      // Create fresh modal handlers for cache update
      const freshModalHandlers = {
        activeModal,
        openModal,
        closeModal,
        showCodeSnippet,
        openCodeSnippet,
        closeCodeSnippet,
        agent: agentQuery?.data,
        activeCodeSnippetKey,
        embodimentsData,
        refreshEmbodiments: () => refetchEmbodiments(),
        isActiveInstance: globalModalManager.isActiveInstance(hookInstanceId),
        instanceId: hookInstanceId,
      };

      if (existingSettingIndex >= 0) {
        // Update existing setting
        const newData = [...oldData];
        newData[existingSettingIndex] = structureAgentSetting(
          key,
          value.toString(),
          isUpdating,
          {
            agentId,
            canUseEmbodiments,
            isReadOnlyAccess,
            agentDeployed,
          },
          freshModalHandlers,
        );
        return newData;
      } else {
        // Add new setting
        return [
          ...oldData,
          structureAgentSetting(
            key,
            value.toString(),
            isUpdating,
            {
              agentId,
              canUseEmbodiments,
              isReadOnlyAccess,
              agentDeployed,
            },
            freshModalHandlers,
          ),
        ];
      }
    });
  };

  /**
   * Updates an embodiment status and refetches data
   * @param embodimentType - The type of embodiment to update
   * @param status - The new status (true/false)
   */
  const updateEmbodimentStatus = async (embodimentType: string, status: boolean) => {
    try {
      // Format the value correctly for MCP settings to match API behavior
      const formattedValue = status.toString();

      updateAgentSettingsCache(embodimentType, formattedValue, true);
      callCallback();
      await updateEmbodiment(agentId, embodimentType, status);

      if (status) {
        Observability.observeInteraction(EVENTS.AGENT_SETTINGS_EVENTS.app_work_location_toggle, {
          locationType: embodimentType.toLowerCase(),
        });
      }
      updateAgentSettingsCache(embodimentType, formattedValue, false);
      callCallback();
    } catch (error) {
      console.error(`Error updating embodiment status: ${error}`);
      throw error;
    }
  };

  function callCallback() {
    if (callback) {
      const currentAgentSettings =
        (queryClient.getQueryData(['agentSettings', agentId]) as AgentSetting[]) || [];
      const currentEmbodimentsData =
        (queryClient.getQueryData(['agentEmbodiments', agentId]) as Embodiment[]) || [];
      callback(
        currentAgentSettings,
        currentEmbodimentsData,
        availableEmbodiments,
        canUseEmbodiments,
        isReadOnlyAccess,
      );
    }
  }

  return {
    isLoading: agentSettingsLoading || embodimentsLoading,
    updateEmbodimentStatus,
    refetchEmbodiments,
    modalHandlers: {
      activeModal,
      openModal,
      closeModal,
      showCodeSnippet,
      activeCodeSnippetKey,
      openCodeSnippet,
      closeCodeSnippet,
      isActiveInstance: globalModalManager.isActiveInstance(hookInstanceId),
      instanceId: hookInstanceId,
    },
  };
};
