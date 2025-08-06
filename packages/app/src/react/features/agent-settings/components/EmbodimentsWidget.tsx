import WidgetCard from '@react/features/agent-settings/components/WidgetCard';
import { Spinner } from '@react/shared/components/ui/spinner';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { Agent } from '@react/shared/types/agent-data.types';
import { Agent as AgentInstance } from '@src/frontend/Agent.class';
import config from '@src/frontend/config';
import {
  getEmbodimentDataAttribute,
  getEmbodimentDescription,
  getEmbodimentIcon,
  getEmbodimentTitle,
} from '@src/react/features/embodiments/embodiment-configs';
import { useAgentEmbodimentSettings } from '@src/react/features/embodiments/embodiment-settings';
import { Tooltip } from 'flowbite-react';
import { Info } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { FaCode, FaLock, FaSliders } from 'react-icons/fa6';

const uiServer = config.env.UI_SERVER;
const agentInstance = new AgentInstance(uiServer);

interface IProps {
  agent: Agent;
  agentId: string;
  isWriteAccess?: boolean;
}

const EmbodimentsWidget = ({ agent, agentId, isWriteAccess }: IProps) => {
  // Create a unique instance identifier for this widget
  const instanceId = useMemo(
    () => `embodiments-widget-${agentId}-${Math.random().toString(36).substr(2, 9)}`,
    [agentId],
  );

  const { hasReadOnlyPageAccess, userInfo, loading: userInfoLoading } = useAuthCtx();
  const [state, setState] = useState({
    availableEmbodiments: [] as string[],
    embodimentsData: [] as any[],
    agentSettings: [] as any[],
    isLoading: false,
  });

  const {
    isLoading: agentSettingsLoading,
    updateEmbodimentStatus,
    refetchEmbodiments,
    modalHandlers,
  } = useAgentEmbodimentSettings(
    agentId,
    (agentSettings, embodimentsData, availableEmbodiments) => {
      setState((prevState) => ({
        ...prevState,
        agentSettings,
        embodimentsData,
        availableEmbodiments,
      }));
    },
    instanceId, // Pass the instance ID to the hook
  );

  const planProperties = userInfo?.subs?.plan?.properties;
  const isReadOnlyAccess = hasReadOnlyPageAccess('/agents');
  const canUseEmbodiments = planProperties?.flags?.embodimentsEnabled;

  const renderEmbodiments = useMemo(() => {
    if (state.isLoading || userInfoLoading) {
      return <EmbodimentsSkeletion />;
    }

    return state.availableEmbodiments.map((item: string) => {
      let itemSettings = state.agentSettings.find((setting) => setting.key === item);

      // If no settings exist for this embodiment, create default settings
      if (!itemSettings) {
        itemSettings = {
          key: item,
          value: 'false',
          enabled: false,
          isUpdating: false,
          embIcon: getEmbodimentIcon(item, 'text-[#515151] text-xl'),
          embTitle: getEmbodimentTitle(item),
          embDescription: getEmbodimentDescription(item),
          codeSnippetVisible: false,
          configurationVisible: false,
          qaDataAttribute: getEmbodimentDataAttribute(item),
        };
      } else {
        itemSettings.qaDataAttribute = getEmbodimentDataAttribute(item);
      }

      return (
        <div
          className="bg-white rounded-lg p-4 shadow-sm"
          key={item}
          data-qa={itemSettings.qaDataAttribute}
        >
          <div className="flex justify-between items-center mb-2 h-6">
            <div className="flex gap-2 items-center">
              {itemSettings.embIcon && itemSettings.embIcon}
              <p className="text-[15px] capitalize font-medium tracking-tight text-gray-900 dark:text-white">
                {itemSettings.embTitle || 'Untitled Embodiment'}
              </p>
            </div>
            {canUseEmbodiments ? (
              <div className="flex items-center gap-2">
                {itemSettings.isUpdating ? (
                  <Spinner classes="w-5 h-5" />
                ) : (
                  <Tooltip
                    content={
                      isReadOnlyAccess ? "You don't have access to this feature" : 'Enable/Disable'
                    }
                    placement="top"
                  >
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={itemSettings.enabled ?? false}
                        onChange={(e) => updateEmbodimentStatus(item, e.target.checked)}
                        className="sr-only peer"
                        disabled={isReadOnlyAccess}
                      />
                      <div className="w-9 h-5 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-v2-blue"></div>
                    </label>
                  </Tooltip>
                )}
              </div>
            ) : (
              <Tooltip content="Premium Embodiment. Upgrade your plan" placement="top">
                <FaLock cursor={'pointer'} />
              </Tooltip>
            )}
          </div>

          <p className="text-sm text-gray-500 mb-3 w-full">
            {itemSettings.embDescription || 'No description available'}
          </p>

          <div className="flex gap-6 items-center justify-end">
            {itemSettings.codeSnippetVisible && itemSettings.openCodeSnippet && (
              <div
                className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:underline cursor-pointer"
                onClick={() => itemSettings.openCodeSnippet()}
              >
                <FaCode />
                <span>Integration</span>
              </div>
            )}
            {itemSettings.configurationVisible && itemSettings.openModal && (
              <div
                className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:underline cursor-pointer"
                onClick={() => itemSettings.openModal()}
              >
                <FaSliders />
                <span>Configuration</span>
              </div>
            )}
          </div>
        </div>
      );
    });
  }, [
    state.availableEmbodiments,
    state.agentSettings,
    state.isLoading,
    canUseEmbodiments,
    isReadOnlyAccess,
    userInfoLoading,
    updateEmbodimentStatus,
  ]);

  // Render all dialog components and code snippet modals
  // Only render modals if this is the active instance
  const renderModals = useMemo(() => {
    if (!modalHandlers.isActiveInstance) {
      return null;
    }

    return state.agentSettings.map((setting) => (
      <React.Fragment key={`${instanceId}-${setting.key}`}>
        {setting.dialogComponent}
        {setting.codeSnippetComponent}
      </React.Fragment>
    ));
  }, [state.agentSettings, instanceId, modalHandlers.isActiveInstance]);

  return (
    <WidgetCard title="" showOverflow isWriteAccess={isWriteAccess}>
      <div className="p-4 bg-gray-50" data-qa="deploy-to-your-workflow-container">
        <div className="mb-6">
          <h3 className="flex items-center gap-2 text-gray-700 text-sm font-semibold mb-1">
            Deploy to Your Workflow
            <Tooltip
              className="w-52 text-center"
              content="Choose how you want to deploy and integrate your agent."
            >
              <Info className="w-4 h-4" />
            </Tooltip>
          </h3>
        </div>
        <div className="grid gap-4">{renderEmbodiments}</div>
      </div>
      {renderModals}
    </WidgetCard>
  );
};

const EmbodimentsSkeletion = () => (
  <div className="flex flex-col mt-4 gap-y-3 gap-x-14 w-full flex-wrap animate-pulse">
    {Array.from({ length: 2 }).map((_, i) => (
      <div key={i} className="flex items-center w-full">
        <div className="h-4 w-4 bg-gray-200 rounded-full dark:bg-gray-700 mr-2"></div>
        <div className="h-4 bg-gray-200 rounded-sm dark:bg-gray-700 flex-1"></div>
      </div>
    ))}
  </div>
);

export default EmbodimentsWidget;
