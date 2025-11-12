import { useQuery } from '@tanstack/react-query';
import { Tooltip } from 'flowbite-react';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { FaRegPenToSquare } from 'react-icons/fa6';
import { IoChevronDown } from 'react-icons/io5';
import { Link } from 'react-router-dom';

import { Skeleton } from '@react/features/ai-chat/components';
import { CloseIcon } from '@react/features/ai-chat/components/icons';
import { DEFAULT_AVATAR_URL } from '@react/features/ai-chat/constants';
import { useChatContext } from '@react/features/ai-chat/contexts';
import { AgentDetails, AgentSettings } from '@react/shared/types/agent-data.types';
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
  agent?: AgentDetails;
  isLoading: {
    agent: boolean;
    settings: boolean;
  };
}

interface ILLMModels {
  label: string;
  value: string;
  tags: string[];
  default?: boolean;
  provider: string;
}

interface ModelAgent {
  id: string;
  name: string;
  avatar: string;
  description: string;
}

/**
 * Fetch model agents from API
 * @returns Promise of ModelAgent array
 */
const fetchModelAgents = async (): Promise<ModelAgent[]> => {
  const response = await fetch('/api/page/agents/models');
  const data = await response.json();
  return data.agents;
};

export const ChatHeader: FC<ChatHeaderProps> = (props) => {
  const { agent, isLoading, agentSettings } = props;

  const avatar = agentSettings?.avatar;
  const selectedModel = agentSettings?.chatGptModel;

  const { clearChatSession, selectedModelOverride, setSelectedModelOverride } = useChatContext();

  // Fetch model agents to check if current agent is a model agent
  const { data: modelAgents } = useQuery<ModelAgent[]>({
    queryKey: ['modelAgents'],
    queryFn: fetchModelAgents,
  });

  // Check if current agent.id exists in modelAgents list
  const isModelAgent = modelAgents?.some((modelAgent) => modelAgent.id === agent?.id) ?? false;

  // Use override if set, otherwise use agent's default model
  const currentModel = selectedModelOverride || selectedModel || '';

  // State for LLM models
  const [llmModels, setLlmModels] = useState<Array<ILLMModels>>([]);
  const [isModelsLoading, setIsModelsLoading] = useState<boolean>(true);
  const [provider, setProvider] = useState<string>(currentModel);

  // State for custom dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
            provider: model.provider || '',
          }),
        );

        setLlmModels(models);
        setIsModelsLoading(false);
        setProvider(models.find((m) => m.value === currentModel)?.provider || 'OpenAI');
      });
  }, [currentModel]);

  /**
   * Handle click outside dropdown to close it
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
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
  const toggleDropdown = useCallback(() => setIsDropdownOpen((prev) => !prev), []);

  // Get unique providers and group models by provider
  const providers = Array.from(new Set(llmModels.map((model) => model.provider)));

  return (
    <div className="w-full bg-white border-b border-[#e5e5e5] h-14 flex justify-center absolute top-0 left-0 z-10 px-2.5 lg:px-0">
      <div className="w-full max-w-4xl flex justify-between items-center">
        {/* Left side - Agent Avatar, Name and Model Selection */}
        <div className="w-full flex items-center gap-3">
          <figure>
            {isLoading.settings ? (
              <Skeleton className="size-8 rounded-full" />
            ) : (
              <img
                src={avatar ?? DEFAULT_AVATAR_URL}
                alt="avatar"
                className="size-8 rounded-full transition-opacity duration-300 ease-in-out"
              />
            )}
          </figure>

          <div className="flex items-start justify-center flex-col w-full">
            {isLoading.agent ? (
              <Skeleton
                className={cn(
                  'w-25 h-[18px] rounded',
                  (isLoading.settings || isModelsLoading) && 'rounded-b-none',
                )}
              />
            ) : (
              <span className="text-lg font-medium text-[#111827] transition-opacity duration-300 ease-in-out leading-none">
                {agent?.name ?? 'Unknown Agent'}
              </span>
            )}

            {/* Model selection */}
            <div className="flex items-center group w-full">
              {isLoading.settings || isModelsLoading ? (
                <Skeleton
                  className={cn('w-25 h-4 rounded ', isLoading.settings && 'rounded-t-none')}
                />
              ) : (
                <div ref={dropdownRef} className="relative leading-none w-full">
                  {/* Selected value display - clickable trigger */}
                  <Tooltip
                    content={isModelAgent ? 'Default agents have a fixed model' : 'Select model'}
                    placement="bottom"
                  >
                    <button
                      type="button"
                      onClick={toggleDropdown}
                      disabled={
                        isLoading.agent || isLoading.settings || isModelsLoading || isModelAgent
                      }
                      className={cn(
                        'inline-flex items-center gap-0.5 text-xs text-slate-500 leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        !isModelAgent && 'cursor-pointer hover:text-slate-900',
                      )}
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
                        className={cn(
                          'size-3 text-slate-500 flex-shrink-0 transition-transform leading-none',
                          !isModelAgent && 'group-hover:text-slate-900',
                          isDropdownOpen && 'rotate-180',
                        )}
                      />
                    </button>
                  </Tooltip>

                  {/* Dropdown menu - only show if not a model agent */}
                  {isDropdownOpen && !isModelAgent && (
                    <>
                      <div className="absolute top-full -left-3 z-50 mt-1 bg-slate-100 rounded-md shadow-xl border-t border-slate-200 min-w-[250px] max-h-[500px] overflow-y-auto divide-y divide-slate-200">
                        {providers.map((llmProvider, index) => (
                          <div
                            key={index}
                            className={cn(
                              'px-4 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors duration-300 ease-in-out',
                              llmProvider === provider
                                ? 'bg-slate-200/90'
                                : 'hover:bg-slate-200/90',
                            )}
                            onClick={() => setProvider(llmProvider)}
                          >
                            <div className="w-full flex items-center gap-2">
                              <img
                                src={`/img/provider_${llmProvider.toLowerCase()}.svg`}
                                alt={`${llmProvider} icon`}
                                className="size-5"
                              />
                              <span className="font-semibold text-sm text-slate-900">
                                {llmProvider}
                              </span>
                            </div>
                            <IoChevronDown
                              className={cn(
                                'size-4 text-slate-900 flex-shrink-0 transition-transform leading-none -rotate-90',
                                llmProvider === provider ? 'block' : 'hidden',
                              )}
                            />
                          </div>
                        ))}
                      </div>
                      <div
                        className={cn(
                          'absolute left-[240px] z-50 w-[300px] max-h-[500px] overflow-y-auto bg-slate-100 rounded-md shadow-xl',
                        )}
                        style={{
                          top:
                            providers.indexOf(provider) > 0
                              ? `${20 + providers.indexOf(provider) * 36}px`
                              : '20px',
                        }}
                      >
                        {llmModels
                          .filter((model) => model.provider === provider)
                          .map((model, modelIndex) => {
                            const badge = getTempBadge(model.tags);
                            const isSelected = model.value === currentModel;

                            return (
                              <button
                                key={modelIndex}
                                type="button"
                                onClick={() => handleModelChange(model.value)}
                                className={cn(
                                  'w-full  text-left hover:bg-slate-200 transition-colors flex items-center justify-between gap-2 pr-2.5',
                                  isSelected
                                    ? 'font-semibold bg-slate-200/90 text-slate-900 border-l-2 border-slate-700'
                                    : 'text-slate-700',
                                )}
                              >
                                <span className="text-sm flex items-center gap-2.5 px-4 py-2.5">
                                  {model.label}
                                  {badge && (
                                    <span
                                      className={cn(
                                        'text-[10px]  rounded-full px-1.5',
                                        badge === 'SmythOS'
                                          ? 'bg-primary-100/50 text-slate-700'
                                          : 'bg-primary-300 text-slate-700',
                                      )}
                                    >
                                      {badge}
                                    </span>
                                  )}
                                </span>

                                {isSelected && (
                                  <svg
                                    className="w-5 h-5 text-slate-700 shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2.5}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </>
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
