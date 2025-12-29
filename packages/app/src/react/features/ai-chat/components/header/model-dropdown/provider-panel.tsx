import { FC } from 'react';
import { IoChevronDown } from 'react-icons/io5';

import { cn } from '@react/shared/utils/general';

import { ProviderIcon } from './provider-icon';

interface IProps {
  providers: string[];
  selectedProvider: string;
  onProviderSelect: (provider: string) => void; // eslint-disable-line no-unused-vars
}

export const ProviderPanel: FC<IProps> = ({ providers, selectedProvider, onProviderSelect }) => (
  <div className="absolute top-full -left-3 z-50 mt-1 bg-slate-100 rounded-md shadow-xl border-t border-slate-200 min-w-[250px] max-h-[500px] overflow-y-auto divide-y divide-slate-200">
    {providers.map((llmProvider, index) => (
      <div
        key={index}
        className={cn(
          'px-4 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors duration-300 ease-in-out',
          llmProvider === selectedProvider ? 'bg-slate-200/90' : 'hover:bg-slate-200/90',
        )}
        onClick={() => onProviderSelect(llmProvider)}
      >
        <div className="w-full flex items-center gap-2">
          <ProviderIcon provider={llmProvider} />
          <span className="font-semibold text-sm text-slate-900">{llmProvider}</span>
        </div>
        <IoChevronDown
          className={cn(
            'size-4 text-slate-900 flex-shrink-0 transition-transform leading-none -rotate-90',
            llmProvider === selectedProvider ? 'block' : 'hidden',
          )}
        />
      </div>
    ))}
  </div>
);
