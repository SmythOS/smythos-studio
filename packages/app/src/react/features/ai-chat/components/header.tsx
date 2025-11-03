import { Tooltip } from 'flowbite-react';
import { FC, useCallback, useEffect, useState } from 'react';
import { FaRegPenToSquare } from 'react-icons/fa6';
import { Link, useParams } from 'react-router-dom';

import { SETTINGS_KEYS } from '@react/features/agent-settings/constants';
import { Skeleton } from '@react/features/ai-chat/components';
import { CloseIcon } from '@react/features/ai-chat/components/icons';
import { DEFAULT_AVATAR_URL } from '@react/features/ai-chat/constants';
import { useChatContext } from '@react/features/ai-chat/contexts';
import { useUpdateAgentSettingsMutation } from '@react/features/ai-chat/hooks';
import { AgentSettings } from '@react/shared/types/agent-data.types';
import { LLMFormController } from '@src/builder-ui/helpers/LLMFormController.helper';
import { errorToast } from '@src/shared/components/toast';
import { Observability } from '@src/shared/observability';
import { EVENTS } from '@src/shared/posthog/constants/events';
import { LLMRegistry } from '@src/shared/services/LLMRegistry.service';
import { llmModelsStore } from '@src/shared/state_stores/llm-models';

// #region Temporary Badges
const TEMP_BADGES: Record<string, boolean> = {
  enterprise: true,
  smythos: true,
  personal: true,
  limited: true,
};

/**
 * Get badge string from model tags
 * @param tags - Array of model tags
 * @returns Badge string for display
 */
function getTempBadge(tags: string[]): string {
  return tags.filter((tag) => TEMP_BADGES?.[tag?.toLowerCase()]).join(' ');
}
// #endregion Temporary Badges

interface ChatHeaderProps {
  agentSettings?: AgentSettings;
  agentName?: string;
  isAgentLoading?: boolean;
  isSettingsLoading?: boolean;
}

interface ILLMModels {
  label: string;
  value: string;
  tags: string[];
  default?: boolean;
}

export const ChatHeader: FC<ChatHeaderProps> = (props) => {
  const { agentName, isAgentLoading, isSettingsLoading, agentSettings } = props;

  const avatar = agentSettings?.avatar;
  const selectedModel = agentSettings?.chatGptModel;

  const { clearChatSession } = useChatContext();
  const { agentId } = useParams<{ agentId: string }>();
  const { mutateAsync: updateAgentSettings } = useUpdateAgentSettingsMutation();

  // State for LLM models
  const [llmModels, setLlmModels] = useState<Array<ILLMModels>>([]);
  const [isModelsLoading, setIsModelsLoading] = useState<boolean>(true);
  const [currentModel, setCurrentModel] = useState<string>(selectedModel || '');

  /**
   * Initialize LLM models store on component mount
   * Fetches available models with 'tools' feature
   */
  useEffect(() => {
    llmModelsStore
      .getState()
      .init()
      .finally(() => {
        const models: Array<ILLMModels> = LLMRegistry.getSortedModelsByFeatures('tools').map(
          (model) => ({
            label: model.label,
            value: model.entryId,
            tags: model.tags,
            default: model?.default || false,
          }),
        );

        // Set default model if no model is selected
        if (!selectedModel && models.length > 0) {
          const defaultModel = LLMFormController.getDefaultModel(models);
          setCurrentModel(defaultModel);
        }

        setLlmModels(models);
        setIsModelsLoading(false);
      });
  }, [selectedModel]);

  /**
   * Update current model when selectedModel prop changes
   */
  useEffect(() => {
    if (selectedModel) setCurrentModel(selectedModel);
  }, [selectedModel]);

  /**
   * Handle model selection change
   * Saves the selected model to agent settings and tracks the event
   */
  const handleModelChange = useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newModel = event.target.value;
      setCurrentModel(newModel);

      if (!agentId) {
        errorToast('Agent ID not found');
        return;
      }

      try {
        // Save to agent settings using centralized settings key constant
        await updateAgentSettings({
          agentId,
          settings: { key: SETTINGS_KEYS.chatGptModel, value: newModel },
        });

        // Track model change event (synchronous, no need to await)
        Observability.observeInteraction(EVENTS.AGENT_SETTINGS_EVENTS.app_LLM_selected, {
          model: newModel,
        });
      } catch {
        errorToast('Failed to update model');
        // Revert to previous model on error
        setCurrentModel(selectedModel || '');
      }
    },
    [agentId, selectedModel, updateAgentSettings],
  );

  return (
    <div className="w-full bg-white border-b border-[#e5e5e5] h-14 flex justify-center absolute top-0 left-0 z-10 px-2.5 lg:px-0">
      <div className="w-full max-w-4xl flex justify-between items-center">
        {/* Left side - Agent Avatar, Name and Model Selection */}
        <div className="w-full flex items-center gap-3">
          <figure>
            {isSettingsLoading ? (
              <Skeleton className="size-8 rounded-full" />
            ) : (
              <img
                src={avatar ?? DEFAULT_AVATAR_URL}
                alt="avatar"
                className="size-8 rounded-full transition-opacity duration-300 ease-in-out"
              />
            )}
          </figure>

          <div className="flex items-start justify-center flex-col">
            {isAgentLoading ? (
              <Skeleton className="w-24 h-6 rounded-md" />
            ) : (
              <span className="text-lg font-medium text-[#111827] transition-opacity duration-300 ease-in-out">
                {agentName || 'Unknown Agent'}
              </span>
            )}

            {/* Model selection */}
            <div className="flex items-center w-fit">
              {isSettingsLoading ? (
                <Skeleton className="w-20 h-5 rounded-lg" />
              ) : (
                <select
                  name="model"
                  id="model"
                  value={currentModel}
                  onChange={handleModelChange}
                  className="w-fit -ml-1 p-0 px-1 bg-white border-0 rounded-t text-xs text-slate-500 leading-none focus:ring-slate-300 bg-none appearance-none [&::-ms-expand]:hidden"
                  disabled={isAgentLoading || isSettingsLoading || isModelsLoading}
                >
                  {llmModels.map((model) => {
                    let badge = getTempBadge(model.tags);
                    badge = badge ? ' (' + badge + ')' : '';

                    return (
                      <option key={model.value} value={model.value}>
                        {model.label + badge}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Action buttons */}
        <div className=" flex items-center justify-center gap-2">
          <Tooltip content={<>New&nbsp;Chat</>} placement="bottom">
            <button
              className="cursor-pointer w-6 h-6 flex items-center justify-center"
              onClick={clearChatSession}
            >
              <FaRegPenToSquare className="text-slate-500 w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Exit" placement="bottom">
            <Link to="/agents">
              <CloseIcon className="text-slate-500 w-6 h-6" />
            </Link>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
