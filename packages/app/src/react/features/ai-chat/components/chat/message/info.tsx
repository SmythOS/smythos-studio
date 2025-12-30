import { InfoIcon } from '@react/features/ai-chat/components';
import { TMessageProps } from '@react/features/ai-chat/types';
import { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const Info: FC<TMessageProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-start">
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 max-w-screen-md flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <InfoIcon className="text-amber-500" />
        </div>

        <div className="flex-1 text-amber-800 text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
