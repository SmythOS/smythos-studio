import { Tooltip } from 'flowbite-react';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { FaRegPenToSquare } from 'react-icons/fa6';
import { IoChevronDown } from 'react-icons/io5';
import { Link } from 'react-router-dom';

import { Skeleton } from '@react/features/ai-chat/components';
import { CloseIcon } from '@react/features/ai-chat/components/icons';
import { DEFAULT_AVATAR_URL } from '@react/features/ai-chat/constants';
import { useChatContext } from '@react/features/ai-chat/contexts';
import { AgentSettings } from '@react/shared/types/agent-data.types';
import { cn } from '@src/react/shared/utils/general';
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

  const { clearChatSession, selectedModelOverride, setSelectedModelOverride } = useChatContext();

  // State for LLM models
  const [llmModels, setLlmModels] = useState<Array<ILLMModels>>([]);
  const [isModelsLoading, setIsModelsLoading] = useState<boolean>(true);

  // State for custom dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use override if set, otherwise use agent's default model
  const currentModel = selectedModelOverride || selectedModel || '';

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

        setLlmModels(models);
        setIsModelsLoading(false);
      });
  }, []);

  /**
   * Handle click outside dropdown to close it
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  /**
   * Handle model selection change
   * Only updates context state - does NOT modify agent configuration
   * Model override is sent with each request via x-model-id header
   */
  const handleModelChange = useCallback(
    (newModel: string) => {
      // Set temporary model override (not saved to agent config)
      setSelectedModelOverride(newModel);

      // Close dropdown after selection
      setIsDropdownOpen(false);

      // Track model change event (synchronous, no need to await)
      Observability.observeInteraction(EVENTS.AGENT_SETTINGS_EVENTS.app_LLM_selected, {
        model: newModel,
      });
    },
    [setSelectedModelOverride],
  );

  /**
   * Toggle dropdown open/close
   */
  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

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
              <Skeleton
                className={cn(
                  'w-25 h-[18px] rounded',
                  (isSettingsLoading || isModelsLoading) && 'rounded-b-none',
                )}
              />
            ) : (
              <span className="text-lg font-medium text-[#111827] transition-opacity duration-300 ease-in-out leading-none">
                {agentName || 'Unknown Agent'}
              </span>
            )}

            {/* Model selection */}
            <div className="flex items-center group">
              {isSettingsLoading || isModelsLoading ? (
                <Skeleton
                  className={cn('w-25 h-4 rounded ', isSettingsLoading && 'rounded-t-none')}
                />
              ) : (
                <div ref={dropdownRef} className="relative leading-none">
                  {/* Selected value display - clickable trigger */}
                  <button
                    type="button"
                    onClick={toggleDropdown}
                    disabled={isAgentLoading || isSettingsLoading || isModelsLoading}
                    className="inline-flex items-center gap-0.5 text-xs text-slate-500 leading-none cursor-pointer hover:text-slate-900 transition-colors disabled:cursor-not-allowed disabled:opacity-50 "
                  >
                    {/* Display selected model label */}
                    <span>
                      {llmModels.find((m) => m.value === currentModel)?.label || 'Select Model'}
                      {(() => {
                        const selectedModelData = llmModels.find((m) => m.value === currentModel);
                        if (selectedModelData) {
                          const badge = getTempBadge(selectedModelData.tags);
                          return badge ? ` (${badge})` : '';
                        }
                        return '';
                      })()}
                    </span>
                    {/* Dropdown icon */}
                    <IoChevronDown
                      className={`size-3 text-slate-500 group-hover:text-slate-900 flex-shrink-0 transition-transform leading-none ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown menu */}
                  {isDropdownOpen && (
                    <div className="absolute top-full -left-3 mt-1 bg-slate-100 border border-slate-200 rounded-md shadow-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto divide-y divide-slate-200">
                      {llmModels.map((model) => {
                        let badge = getTempBadge(model.tags);
                        badge = badge ? ' (' + badge + ')' : '';
                        const isSelected = model.value === currentModel;

                        return (
                          <button
                            key={model.value}
                            type="button"
                            onClick={() => handleModelChange(model.value)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-200 transition-colors focus:outline-none ${
                              isSelected
                                ? 'bg-slate-300 text-slate-800 font-medium'
                                : 'text-slate-600'
                            }`}
                          >
                            {model.label + badge}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
