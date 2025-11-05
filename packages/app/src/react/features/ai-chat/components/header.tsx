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
            provider: model.provider || '',
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
  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  // Badge priority order for sorting (lower number = higher priority)
  const BADGE_PRIORITY: Record<string, number> = {
    enterprise: 1,
    personal: 2,
    limited: 3,
    smythos: 999, // SmythOS models come last
  };

  /**
   * Get badge priority for sorting
   * @param tags - Array of model tags
   * @returns Priority number (lower = higher priority)
   */
  const getBadgePriority = (tags: string[]) => {
    return BADGE_PRIORITY[getTempBadge(tags).toLowerCase()] || 999;
  };

  // Get unique providers and group models by provider
  const providers = Array.from(new Set(llmModels.map((model) => model.provider)));
  const modelsByProvider = providers.map((provider) => {
    const providerModels = llmModels.filter((model) => model.provider === provider);

    // Sort models with multiple criteria:
    // 1. Badge priority (Enterprise > Personal > Limited > SmythOS)
    // 2. Then by default flag (default models first)
    // 3. Finally alphabetically by label
    const sortedModels = [...providerModels].sort((a, b) => {
      // First priority: Badge priority (Enterprise > Personal > Limited > SmythOS)
      const priorityA = getBadgePriority(a.tags);
      const priorityB = getBadgePriority(b.tags);
      if (priorityA !== priorityB) return priorityA - priorityB;
      // Second priority: Default models come first
      if (a.default !== b.default) return a.default ? 1 : -1;
      // Third priority: Alphabetically by label
      return a.label.localeCompare(b.label);
    });

    return { name: provider, models: sortedModels };
  });

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

          <div className="flex items-start justify-center flex-col">
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
            <div className="flex items-center group">
              {isLoading.settings || isModelsLoading ? (
                <Skeleton
                  className={cn('w-25 h-4 rounded ', isLoading.settings && 'rounded-t-none')}
                />
              ) : (
                <div ref={dropdownRef} className="relative leading-none">
                  {/* Selected value display - clickable trigger */}
                  <Tooltip
                    content={
                      isModelAgent ? 'Model selection is disabled for model agents' : 'Select model'
                    }
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
                    <div className="absolute top-full -left-3 z-50 mt-1 bg-slate-100 rounded-md shadow-xl border-t border-slate-200 min-w-[250px] max-h-[500px] overflow-y-auto divide-y divide-slate-200">
                      <div className="py-1">
                        {modelsByProvider.map((provider, providerIndex) => (
                          <div key={providerIndex} className="mb-2 last:mb-1">
                            <div className="px-4 py-1.5 flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-900">
                                {provider.name}
                              </span>
                            </div>

                            <div className="pl-2">
                              {provider.models.map((model, modelIndex) => {
                                const badge = getTempBadge(model.tags);
                                const isSelected = model.value === currentModel;

                                return (
                                  <button
                                    key={modelIndex}
                                    type="button"
                                    onClick={() => handleModelChange(model.value)}
                                    className={cn(
                                      'w-full px-4 py-1.5 text-left hover:bg-slate-200 transition-colors flex items-center justify-between gap-2',
                                      isSelected
                                        ? 'font-semibold bg-slate-200/90 text-slate-900 border-l-2 border-slate-700'
                                        : 'text-slate-700',
                                    )}
                                  >
                                    <span className="text-sm flex items-center gap-1">
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
                          </div>
                        ))}
                      </div>
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
