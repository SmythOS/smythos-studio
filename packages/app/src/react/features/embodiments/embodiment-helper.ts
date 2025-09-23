import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Agent as AgentInstance } from '../../../builder-ui/Agent.class';
import { EMBODIMENT_TYPE } from '../../shared/enums';
import { Agent } from '../../shared/types/agent-data.types';
import { DeploymentWithAgentSnapshot, Embodiment } from '../../shared/types/api-results.types';
import { getAgentEmbodiments, getAgentSettings } from '../agent-settings/clients';
import {
  AlwaysAvailableEmbodiments,
  getChatBotDialog,
  getChatGptDialog,
  getCodeSnippetModal,
  getEmbodimentDescription,
  getEmbodimentIcon,
  getEmbodimentTitle,
  getFormPreviewDialog,
  getVoiceDialog,
} from './embodiment-configs';

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

type AgentSettingsCallback = (agentSettings: AgentSetting[]) => void;

export function structureAgentSetting(
  key: string,
  value: string,
  isUpdating: boolean = false,
  agentData: {
    agentId: string;
    canUseEmbodiments: boolean;
    isReadOnlyAccess: boolean;
    agentDeployed: DeploymentWithAgentSnapshot;
  },
  modalHandlers?: {
    activeModal: string | null;
    openModal: (modalType: string) => void;
    closeModal: () => void;
    showCodeSnippet: boolean;
    activeCodeSnippetKey: string | null;
    openCodeSnippet: (key: string) => void;
    closeCodeSnippet: () => void;
    agent?: Agent;
    embodimentsData?: Embodiment[];
    refreshEmbodiments?: () => void;
    isActiveInstance?: boolean;
    instanceId?: string;
  },
) {
  const embIcon = getEmbodimentIcon(key, 'text-[#515151] text-xl');
  const embTitle = getEmbodimentTitle(key);
  const embDescription = getEmbodimentDescription(key);

  let valueEmb;
  let embEnabled;

  if (key === 'mcp') {
    try {
      // Handle case where value might already be an object or a valid JSON string
      if (typeof value === 'string') {
        // Handle empty string or whitespace-only strings
        if (!value.trim()) {
          valueEmb = { isEnabled: false };
        } else {
          valueEmb = JSON.parse(value);
        }
      } else {
        valueEmb = value;
      }
    } catch (error) {
      // If JSON.parse fails, treat as disabled MCP
      console.warn(`Failed to parse MCP value: ${value}`, error);
      valueEmb = { isEnabled: false };
    }
    // Ensure valueEmb is an object and has isEnabled property
    if (!valueEmb || typeof valueEmb !== 'object') {
      valueEmb = { isEnabled: false };
    }
    embEnabled = Boolean(valueEmb?.isEnabled);
  } else {
    valueEmb = value;
    embEnabled = value === 'true';
  }

  const result: AgentSetting = {
    key,
    value: valueEmb,
    enabled: embEnabled,
    isUpdating,
    embIcon,
    embTitle,
    embDescription,
    codeSnippetVisible: shouldCodeSnippetVisible(key, agentData),
    configurationVisible: shouldConfigurationVisible(agentData, key),
  };

  // Add modal handlers and components if provided
  if (modalHandlers) {
    result.openModal = () => modalHandlers.openModal(key);
    result.openCodeSnippet = () => modalHandlers.openCodeSnippet(key);

    // PRELOADING STRATEGY:
    // Create modal components for preloading if this is the active instance
    // This ensures components are loaded and ready when needed, eliminating loading states
    // Modal components will automatically update when their dependencies change through React's reconciliation
    if (modalHandlers.isActiveInstance) {
      // Always create dialog components for preloading (except iframe-based ones)
      if (key === EMBODIMENT_TYPE.CHAT_GPT) {
        result.dialogComponent = getChatGptDialog(
          modalHandlers.activeModal === key, // Pass visibility state
          modalHandlers.closeModal,
          modalHandlers.agent,
          agentData.agentId,
          modalHandlers.embodimentsData?.find(
            (e) => e.aiAgentId === agentData.agentId && e.type === EMBODIMENT_TYPE.CHAT_GPT,
          ),
          modalHandlers.refreshEmbodiments,
          modalHandlers.activeModal,
        );
      }

      if (key === EMBODIMENT_TYPE.CHAT_BOT) {
        result.dialogComponent = getChatBotDialog(
          modalHandlers.activeModal === key, // Pass visibility state
          modalHandlers.closeModal,
          modalHandlers.agent,
          agentData.agentId,
          modalHandlers.embodimentsData?.find(
            (e) => e.aiAgentId === agentData.agentId && e.type === EMBODIMENT_TYPE.CHAT_BOT,
          ),
          modalHandlers.refreshEmbodiments,
          modalHandlers.activeModal,
        );
      }

      if (key === EMBODIMENT_TYPE.FORM) {
        result.dialogComponent = getFormPreviewDialog(
          modalHandlers.activeModal === key, // Pass visibility state
          modalHandlers.closeModal,
          modalHandlers.agent,
          agentData.agentId,
          modalHandlers.embodimentsData?.find(
            (e) => e.aiAgentId === agentData.agentId && e.type === EMBODIMENT_TYPE.FORM,
          ),
        );
      }

      if (key === EMBODIMENT_TYPE.ALEXA) {
        result.dialogComponent = getVoiceDialog(
          modalHandlers.activeModal === key, // Pass visibility state
          modalHandlers.closeModal,
          modalHandlers.agent,
          agentData.agentId,
          modalHandlers.embodimentsData?.find(
            (e) => e.aiAgentId === agentData.agentId && e.type === EMBODIMENT_TYPE.ALEXA,
          ),
        );
      }

      // Add code snippet modal for chat bot (preload when it should be visible)
      // Note: iframe-based components are conditionally rendered to allow reload as requested
      if (
        (key === EMBODIMENT_TYPE.CHAT_BOT ||
          key === EMBODIMENT_TYPE.FORM ||
          key === EMBODIMENT_TYPE.CHAT_GPT) &&
        shouldCodeSnippetVisible(key, {
          canUseEmbodiments: agentData.canUseEmbodiments,
          isReadOnlyAccess: agentData.isReadOnlyAccess,
          agentDeployed: !!agentData.agentDeployed,
        })
      ) {
        result.codeSnippetComponent = getCodeSnippetModal(
          key,
          modalHandlers.showCodeSnippet && modalHandlers.activeCodeSnippetKey === key, // Pass visibility state
          modalHandlers.closeCodeSnippet,
          modalHandlers.agent,
          agentData.agentId,
          modalHandlers.embodimentsData,
        );
      }
    }
  }

  return result;
}

const shouldCodeSnippetVisible = (
  embodimentType: string,
  agentData: {
    canUseEmbodiments: boolean;
    isReadOnlyAccess: boolean;
    agentDeployed: boolean;
  },
) => {
  return (
    (embodimentType === EMBODIMENT_TYPE.CHAT_BOT ||
      embodimentType === EMBODIMENT_TYPE.FORM ||
      embodimentType === EMBODIMENT_TYPE.CHAT_GPT) &&
    agentData?.agentDeployed &&
    agentData.canUseEmbodiments
  );
};

const shouldConfigurationVisible = (
  agentData: {
    canUseEmbodiments: boolean;
    isReadOnlyAccess: boolean;
  },
  embodimentType: string,
) => {
  return (
    agentData.canUseEmbodiments &&
    !agentData.isReadOnlyAccess &&
    embodimentType.toLowerCase() !== EMBODIMENT_TYPE.API.toLocaleLowerCase() &&
    embodimentType.toLowerCase() !== EMBODIMENT_TYPE.MCP.toLocaleLowerCase() &&
    embodimentType.toLowerCase() !== EMBODIMENT_TYPE.ALEXA.toLocaleLowerCase() &&
    // NOTE: TEMPORARY DISABLE CONFIGURATION FOR AGENT LLM
    embodimentType.toLowerCase() !== EMBODIMENT_TYPE.LLM.toLocaleLowerCase()
  );
};
/**
 * React Query hook for fetching agent settings
 * @param agentId - The agent ID to fetch settings for
 * @param agentData - Agent configuration data
 * @param callback - Optional callback function called when agent settings change
 * @param modalHandlers - Optional modal handlers for dialogs and code snippets
 * @returns Query result with agentSettings data, loading state, and refetch function
 */
export const useAgentSettings = (
  agentId: string,
  agentData: {
    canUseEmbodiments: boolean;
    isReadOnlyAccess: boolean;
    agentId: string;
    agentDeployed: boolean;
  },
  callback?: AgentSettingsCallback,
  modalHandlers?: {
    activeModal: string | null;
    openModal: (modalType: string) => void;
    closeModal: () => void;
    showCodeSnippet: boolean;
    activeCodeSnippetKey: string | null;
    openCodeSnippet: (key: string) => void;
    closeCodeSnippet: () => void;
    agent?: Agent;
    embodimentsData?: Embodiment[];
    refreshEmbodiments?: () => void;
  },
) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['agentSettings', agentId],
    queryFn: async () => {
      const data = await getAgentSettings(agentId);
      return data.map(({ key, value }) => {
        return structureAgentSetting(key, value, false, agentData, modalHandlers);
      });
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 4 * 60 * 1000, // Consider data stale after 4 minutes
    enabled: !!agentId,
    onSuccess: (data) => {
      // Call callback function when agent settings change
      if (callback) {
        callback(data);
      }
    },
  });
};

/**
 * React Query hook for fetching agent embodiments
 * @param agentId - The agent ID to fetch embodiments for
 * @returns Query result with embodiments data, loading state, and refetch function
 */
export const useAgentEmbodiments = (agentId: string, callback?: AgentSettingsCallback) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['agentEmbodiments', agentId],
    queryFn: async () => {
      const { embodiments } = await getAgentEmbodiments(agentId);
      return embodiments;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
    enabled: !!agentId,
    onSuccess: (data) => {
      // Call callback function when agent settings change
      if (callback) {
        callback(data);
      }
    },
  });
};

export function getAvailableEmbodiments(agentInstance: AgentInstance, agentId: string) {
  return agentInstance.load(agentId).then(() => {
    const embodiments = agentInstance.getAvailableEmbodiments();
    return [...Object.keys(embodiments), ...AlwaysAvailableEmbodiments];
  });
}
