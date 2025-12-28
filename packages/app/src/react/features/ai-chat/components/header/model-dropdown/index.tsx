import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { IoChevronDown } from 'react-icons/io5';

import { Tooltip, TooltipContent, TooltipTrigger } from '@react/shared/components/ui/tooltip';
import { cn } from '@react/shared/utils/general';
import { Observability } from '@shared/observability';
import { EVENTS } from '@shared/posthog/constants/events';
import { LLMRegistry } from '@shared/services/LLMRegistry.service';
import { llmModelsStore } from '@shared/state_stores/llm-models';

import type { TLLMModel } from '@react/features/ai-chat/types';
import { getBadgeFromTags } from '@react/features/ai-chat/utils';
import { ModelPanel } from './model-panel';
import { ProviderPanel } from './provider-panel';

interface IProps {
  currentModel: string;
  isModelAgent: boolean;
  isDisabled: boolean;
  onModelChange: (model: string) => void; // eslint-disable-line no-unused-vars
}

export const ModelDropdown: FC<IProps> = (props) => {
  const { currentModel, isModelAgent, isDisabled, onModelChange } = props;

  const [llmModels, setLlmModels] = useState<Array<TLLMModel>>([]);
  const [isModelsLoading, setIsModelsLoading] = useState<boolean>(true);
  const [provider, setProvider] = useState<string>(currentModel);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    llmModelsStore
      .getState()
      .init()
      .finally(() => {
        const models: Array<TLLMModel> = LLMRegistry.getSortedModelsByFeatures('tools').map(
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const handleModelChange = useCallback(
    (newModel: string) => {
      onModelChange(newModel);
      setIsDropdownOpen(false);

      Observability.observeInteraction(EVENTS.AGENT_SETTINGS_EVENTS.app_LLM_selected, {
        model: newModel,
      });
    },
    [onModelChange],
  );

  const toggleDropdown = useCallback(() => setIsDropdownOpen((prev) => !prev), []);

  const providers = Array.from(new Set(llmModels.map((model) => model.provider)));
  const selectedModel = llmModels.find((m) => m.value === currentModel);
  const selectedBadge = selectedModel ? getBadgeFromTags(selectedModel.tags) : '';

  if (isModelsLoading) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative leading-none w-full">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={toggleDropdown}
            disabled={isDisabled || isModelAgent}
            className={cn(
              'inline-flex items-center gap-0.5 text-xs text-slate-500 leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              !isModelAgent && 'cursor-pointer hover:text-slate-900',
            )}
          >
            <span>
              {selectedModel?.label || 'Select Model'}
              {selectedBadge ? ` (${selectedBadge})` : ''}
            </span>
            <IoChevronDown
              className={cn(
                'size-3 text-slate-500 flex-shrink-0 transition-transform leading-none',
                !isModelAgent && 'group-hover:text-slate-900',
                isDropdownOpen && 'rotate-180',
              )}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{isModelAgent ? 'Default agents have a fixed model' : 'Select model'}</p>
        </TooltipContent>
      </Tooltip>

      {isDropdownOpen && !isModelAgent && (
        <>
          <ProviderPanel
            providers={providers}
            selectedProvider={provider}
            onProviderSelect={setProvider}
          />
          <ModelPanel
            models={llmModels.filter((model) => model.provider === provider)}
            currentModel={currentModel}
            providerIndex={providers.indexOf(provider)}
            onModelSelect={handleModelChange}
          />
        </>
      )}
    </div>
  );
};
