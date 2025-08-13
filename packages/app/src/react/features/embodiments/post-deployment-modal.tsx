import EnvironmentWidget from '@src/react/features/agent-settings/components/Deployments/EnvironmentWidget';
import { useDeploymentSidebarCtx } from '@src/react/features/builder/contexts/deployment-sidebar.context';
import {
  getEmbodimentDescription,
  getEmbodimentIcon,
  getEmbodimentTitle,
} from '@src/react/features/embodiments/embodiment-configs';
import { useAgentEmbodimentSettings } from '@src/react/features/embodiments/embodiment-settings';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { Switch } from '@src/react/shared/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@src/react/shared/components/ui/tabs';
import { useAuthCtx } from '@src/react/shared/contexts/auth.context';
import { EMBODIMENT_TYPE } from '@src/react/shared/enums';
import type { Embodiment } from '@src/react/shared/types/api-results.types';
import { Tooltip } from 'flowbite-react';
import { Info } from 'lucide-react';
import { ComponentType, Fragment, useMemo, useState } from 'react';
import { FaLock, FaSliders } from 'react-icons/fa6';

interface AgentSetting {
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
}

/**
 * Props for the PostDeploymentModal card.
 */
interface Props {
  userInfo: Record<string, unknown>;
  onClose: () => void;
  onReopenDeployModal: () => void;
  onOpenLlmModal: (defaultTab: 'code' | 'keys') => void;
  /**
   * Called when the user requests to open the Custom GPT modal.
   */
  onOpenCustomGptModal: () => void;
  /**
   * Called when the user requests to open a dialog modal (e.g., endpoints, configuration).
   * @param title The dialog title
   * @param component The component to render in the dialog
   * @param componentProps Props for the dialog component
   */
  onOpenDialogModal: (
    title: string,
    component?: ComponentType<any>,
    componentProps?: Record<string, unknown>,
  ) => void;
  /**
   * Called when the user requests to open a code snippet modal for a given embodiment key.
   * @param key The embodiment key
   */
  onOpenCodeSnippetModal: (key: string) => void;
  /**
   * Called when the user requests to open the Alexa panel.
   */
  onOpenAlexaPanel: () => void;
  /**
   * Called when the user requests to open the Chatbot panel.
   */
  onOpenChatbotPanel: () => void;
  /**
   * Called when the user requests to open the API panel.
   */
  onOpenApiPanel: () => void;
  /**
   * Called when the user requests to open the MCP panel.
   */
  onOpenMcpPanel: () => void;
  /**
   * If true, the card is visible; otherwise, hidden.
   */
  isVisible: boolean;
}

/**
 * PostDeploymentModal card shown after deployment, or if a deployment exists.
 * Renders as a card, not a modal overlay. No close icon.
 */
function PostDeploymentModal({
  userInfo,
  onClose,
  onReopenDeployModal,
  onOpenLlmModal,
  onOpenCustomGptModal,
  onOpenDialogModal,
  onOpenCodeSnippetModal,
  onOpenAlexaPanel,
  onOpenChatbotPanel,
  onOpenApiPanel,
  onOpenMcpPanel,
  isVisible,
}: Props) {
  const { workspace, allDeployments } = useDeploymentSidebarCtx();
  const { getPageAccess } = useAuthCtx();
  const agentId: string = workspace.agent.id;
  const [activeTab, setActiveTab] = useState<string>('embed');

  // Create a unique instance identifier for this modal
  const instanceId = useMemo(
    () =>
      `post-deployment-modal-${workspace?.agent?.id}-${Math.random().toString(36).substr(2, 9)}`,
    [workspace?.agent?.id],
  );

  const [state, setState] = useState({
    availableEmbodiments: [] as string[],
    embodimentsData: [] as Embodiment[],
    agentSettings: [] as AgentSetting[],
    canUseEmbodiments: false,
    isReadOnlyAccess: false,
  });

  const sortedAvailableEmbodiments = useMemo(() => {
    return state.availableEmbodiments.sort((a: string, b: string) => {
      // Find settings for both embodiments
      const settingA = state.agentSettings.find((s) => s.key === a);
      const settingB = state.agentSettings.find((s) => s.key === b);

      // Check if each is enabled
      const isEnabledA = settingA?.value?.['isEnabled'] || settingA?.value === 'true';
      const isEnabledB = settingB?.value?.['isEnabled'] || settingB?.value === 'true';

      // Sort enabled items first (return negative for A before B)
      if (isEnabledA && !isEnabledB) return -1;
      if (!isEnabledA && isEnabledB) return 1;
      return 0; // Keep original order for items with same status
    });
  }, [state.availableEmbodiments]);

  const {
    isLoading: agentSettingsLoading,
    updateEmbodimentStatus,
    refetchEmbodiments,
    modalHandlers,
  } = useAgentEmbodimentSettings(
    workspace?.agent?.id || '',
    (agentSettings, embodimentsData, availableEmbodiments, canUseEmbodiments, isReadOnlyAccess) => {
      setState({
        agentSettings,
        embodimentsData,
        availableEmbodiments,
        canUseEmbodiments,
        isReadOnlyAccess,
      });
    },
    instanceId, // Pass the instance ID to the hook
  );

  // Check if we're on the agent-settings page to avoid duplicate modals
  const isOnAgentSettingsPage = window.location.pathname.includes('/agent-settings/');

  // Only render modals if we're not on the agent-settings page and this is the active instance
  const shouldRenderModals = !isOnAgentSettingsPage && modalHandlers.isActiveInstance;

  // Handler for toggling embodiment
  const handleToggle = (setting: AgentSetting) => {
    if (setting.isUpdating) {
      return; // Already updating
    }

    // Check if user has access to embodiments
    if (!state.canUseEmbodiments) {
      return; // Don't allow toggle for free plan users
    }

    updateEmbodimentStatus(setting.key, true);
  };

  // Render all dialog components and code snippet modals
  const renderModals = useMemo(() => {
    // Always render modals for preloading if this is the active instance
    // This ensures components are loaded and ready when needed, eliminating loading states
    if (!modalHandlers.isActiveInstance) {
      return null;
    }

    return state.agentSettings.map((setting) => (
      <Fragment key={`${instanceId}-${setting.key}`}>
        {/* Always render dialog components for preloading - they handle their own visibility */}
        {setting.dialogComponent}
        {/* Code snippet components (iframe-based) are conditionally rendered to allow iframe reload */}
        {setting.codeSnippetComponent}
      </Fragment>
    ));
  }, [
    state.agentSettings,
    instanceId,
    modalHandlers.isActiveInstance,
    // Include dependencies that trigger component updates
    state.embodimentsData,
    workspace?.agent,
  ]);

  // Type guard for Embodiment with properties
  function hasProperties(obj: unknown): obj is Embodiment {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'properties' in obj &&
      typeof (obj as any).properties === 'object'
    );
  }

  /**
   * Capitalizes the first letter of a string.
   * @param str - The string to capitalize
   * @returns The string with the first letter capitalized
   */
  const capitalizeFirstLetter = (str: string): string => {
    if (str.length === 0) return str;
    return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
  };

  /**
   * Maps embodiment setting key to data-qa attribute value
   * @param settingKey - The embodiment setting key
   * @returns The data-qa attribute value
   */
  const getEmbodimentLocator = (settingKey: string): string => {
    switch (settingKey.toLowerCase()) {
      case 'chatgpt':
        return 'chatgpt-embodiment';
      case 'chatbot':
        return 'chatbot-embodiment';
      case 'llm':
        return 'agentllm-embodiment';
      case 'api':
        return 'api-embodiment';
      case 'mcp':
        return 'mcp-embodiment';
      case 'alexa':
        return 'alexa-embodiment';
      default:
        return `${settingKey}-embodiment`;
    }
  };

  function getSettingsValues(item: string): {
    buttons: JSX.Element[];
    embodimentName: string;
    isSettingEnabled: boolean;
    setting: AgentSetting;
  } {
    let setting = state.agentSettings.find((s) => s.key === item);

    // If no settings exist for this embodiment, create default settings
    if (!setting) {
      setting = {
        key: item,
        value: 'false',
        enabled: false,
        isUpdating: false,
        embIcon: getEmbodimentIcon(item, 'fill-[#515151] text-[#515151] text-xl'),
        embTitle: getEmbodimentTitle(item),
        embDescription: getEmbodimentDescription(item),
        codeSnippetVisible: false,
        configurationVisible: false,
      };
    }

    const key = setting.key.toLowerCase();
    const buttons: JSX.Element[] = [];
    // Custom GPT (ChatGPT)
    if (key === EMBODIMENT_TYPE.CHAT_GPT) {
      if (setting.openModal) {
        buttons.push(
          <button
            key={'configuration-' + EMBODIMENT_TYPE.CHAT_GPT}
            className="flex items-center px-2 py-1 h-8 text-xl text-blue-600 hover:bg-smythos-blue-500 hover:text-white rounded"
            onClick={() => setting.openModal()}
            type="button"
            aria-label="Configuration"
          >
            <FaSliders />
          </button>,
        );
      }
      buttons.push(
        <Button
          key="get-code"
          label="Get Code"
          variant="tertiary"
          className="px-3 py-1 h-8 text-xs"
          handleClick={() => onOpenCustomGptModal()}
          aria-label="Get Code"
          type="button"
        />,
      );
    }
    // Chatbot
    else if (key === EMBODIMENT_TYPE.CHAT_BOT) {
      if (setting.openCodeSnippet) {
        buttons.push(
          <button
            key={'configuration-' + EMBODIMENT_TYPE.CHAT_BOT}
            className="flex items-center px-2 py-1 h-8 text-xl text-blue-600 hover:bg-smythos-blue-500 hover:text-white rounded"
            onClick={() => setting.openModal()}
            type="button"
            aria-label="Configuration"
          >
            <FaSliders />
          </button>,
        );
      }
      if (setting.openModal) {
        buttons.push(
          <Button
            key="get-code"
            label="Get Code"
            variant="tertiary"
            className="px-3 py-1 h-8 text-xs"
            handleClick={() => onOpenChatbotPanel()}
            aria-label="Get Code"
            type="button"
          />,
        );
      }
    }
    // Form Preview
    else if (key === EMBODIMENT_TYPE.FORM) {
      if (setting.openCodeSnippet) {
        buttons.push(
          <button
            key={'configuration-' + EMBODIMENT_TYPE.FORM}
            className="flex items-center px-2 py-1 h-8 text-xl text-blue-600 hover:bg-smythos-blue-500 hover:text-white rounded"
            onClick={() => setting.openModal()}
            type="button"
            aria-label="Configuration"
          >
            <FaSliders />
          </button>,
        );
      }
      if (setting.openModal) {
        buttons.push(
          <Button
            key="get-code"
            label="Get Code"
            variant="tertiary"
            className="px-3 py-1 h-8 text-xs"
            handleClick={() => onOpenChatbotPanel()}
            aria-label="Get Code"
            type="button"
          />,
        );
      }
    }
    // LLM
    else if (key === EMBODIMENT_TYPE.LLM) {
      buttons.push(
        <Button
          key={'api-keys-' + EMBODIMENT_TYPE.LLM}
          label="API Keys"
          variant="tertiary"
          className="px-3 py-1 h-8 text-xs"
          handleClick={() => onOpenLlmModal('keys')}
          aria-label="API Keys"
          type="button"
        />,
      );
      buttons.push(
        <Button
          key={'get-code-' + EMBODIMENT_TYPE.LLM}
          label="Get Code"
          variant="tertiary"
          className="px-3 py-1 h-8 text-xs"
          handleClick={() => onOpenLlmModal('code')}
          aria-label="Get Code"
          type="button"
        />,
      );
    }
    // API (robust match)
    else if (key.indexOf(EMBODIMENT_TYPE.API) !== -1) {
      buttons.push(
        <Button
          key="get-endpoints"
          label="Get Endpoints"
          variant="tertiary"
          className="px-3 py-1 h-8 text-xs"
          handleClick={onOpenApiPanel}
          aria-label="Get Endpoints"
          type="button"
        />,
      );
    }
    // MCP
    else if (key === EMBODIMENT_TYPE.MCP) {
      buttons.push(
        <Button
          key={'get-url-' + EMBODIMENT_TYPE.MCP}
          label="Get URL"
          variant="tertiary"
          className="px-3 py-1 h-8 text-xs"
          handleClick={onOpenMcpPanel}
          aria-label="Get URL"
          type="button"
        />,
      );
    }
    // Alexa
    else if (key === EMBODIMENT_TYPE.ALEXA) {
      buttons.push(
        <Button
          key={'get-endpoints-' + EMBODIMENT_TYPE.ALEXA}
          label="Get Endpoints"
          variant="tertiary"
          className="px-3 py-1 h-8 text-xs"
          handleClick={onOpenAlexaPanel}
          aria-label="Get Endpoints"
          type="button"
        />,
      );
    }
    const embodimentName = capitalizeFirstLetter(
      key === EMBODIMENT_TYPE.CHAT_GPT ? 'Custom GPT' : setting.embTitle || 'Untitled Embodiment',
    );
    const isSettingEnabled = setting?.value?.['isEnabled'] || setting.value == 'true';
    return {
      setting,
      buttons,
      embodimentName,
      isSettingEnabled,
    };
  }

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-lg w-full p-6 flex flex-col gap-4 max-h-[90vh] max-w-[480px] ${
        !isVisible ? 'hidden' : ''
      }`}
      style={{
        boxShadow: '0 4px 32px 0 rgba(0,0,0,0.10)',
        borderRadius: '20px',
        padding: '32px 24px',
        margin: '0 auto',
      }}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-auto">
          <TabsTrigger value="embed" className="px-10 py-2.5 text-sm rounded-sm">
            Embed
          </TabsTrigger>
          <TabsTrigger value="domains-keys" className="px-10 py-2.5 text-sm rounded-sm">
            Domains
          </TabsTrigger>
        </TabsList>
        <TabsContent value="embed" className="space-y-2">
          <div className="space-y-2">
            {agentSettingsLoading ? (
              <div className="text-center text-gray-400">Loading embodiments...</div>
            ) : state.availableEmbodiments.length > 0 ? (
              sortedAvailableEmbodiments.map((item: string) => {
                const { setting, buttons, embodimentName, isSettingEnabled } =
                  getSettingsValues(item);
                return (
                  <div
                    key={setting.key}
                    data-qa={getEmbodimentLocator(setting.key)}
                    className={`flex items-center justify-between bg-white rounded-lg px-2 py-2 ${
                      !isSettingEnabled ? 'opacity-80' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <span className="text-xl flex items-center justify-center w-6 h-6">
                        {setting.embIcon}
                      </span>
                      {/* Title with Tooltip */}
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#515151] text-base capitalize">
                          {embodimentName}
                        </span>
                        {setting.embDescription && (
                          <Tooltip
                            content={setting.embDescription}
                            placement="top"
                            className="w-56 text-center"
                          >
                            <Info className="w-4 h-4 text-[#515151]" />
                          </Tooltip>
                        )}
                      </div>
                    </div>
                    {setting.isUpdating ? (
                      <div className="flex items-center gap-2">
                        <div className="circular-loader-blue w-4 h-4"></div>
                      </div>
                    ) : !state.canUseEmbodiments ? (
                      <Tooltip content="Premium Embodiment. Upgrade your plan" placement="top">
                        <FaLock cursor={'pointer'} className="text-gray-400" />
                      </Tooltip>
                    ) : isSettingEnabled ? (
                      <div className="flex items-center gap-2">{buttons}</div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={false}
                          onCheckedChange={() => handleToggle(setting)}
                          disabled={setting.isUpdating}
                          className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-300"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-400">No embodiments found.</div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="domains-keys" className="space-y-6">
          {/* Environment section using EnvironmentWidget directly */}
          <EnvironmentWidget
            isDeployed={allDeployments?.data?.deployments.length > 0}
            isWriteAccess={getPageAccess('/builder').write}
          />
        </TabsContent>
      </Tabs>

      {renderModals}
    </div>
  );
}

export default PostDeploymentModal;
