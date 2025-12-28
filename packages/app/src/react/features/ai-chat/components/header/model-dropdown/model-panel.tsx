import { FC } from 'react';

import { cn } from '@react/shared/utils/general';

import type { TLLMModel } from '@react/features/ai-chat/types';
import { getBadgeFromTags } from '@react/features/ai-chat/utils';

interface IProps {
  models: TLLMModel[];
  currentModel: string;
  providerIndex: number;
  onModelSelect: (model: string) => void; // eslint-disable-line no-unused-vars
}

export const ModelPanel: FC<IProps> = ({ models, currentModel, providerIndex, onModelSelect }) => (
  <div
    className="absolute left-[240px] z-50 w-[300px] max-h-[500px] overflow-y-auto bg-slate-100 rounded-md shadow-xl"
    style={{
      top: providerIndex > 0 ? `${20 + providerIndex * 36}px` : '20px',
    }}
  >
    {models.map((model, modelIndex) => {
      const badge = getBadgeFromTags(model.tags);
      const isSelected = model.value === currentModel;

      return (
        <button
          key={modelIndex}
          type="button"
          onClick={() => onModelSelect(model.value)}
          className={cn(
            'w-full text-left hover:bg-slate-200 transition-colors flex items-center justify-between gap-2 pr-2.5',
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
                  'text-[10px] rounded-full px-1.5',
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
);
