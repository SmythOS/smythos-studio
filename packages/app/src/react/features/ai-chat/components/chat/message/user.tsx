import { FileItemPreview } from '@react/features/ai-chat/components';
import type { TAttachment } from '@react/features/ai-chat/types';
import { FC } from 'react';

type TProps = {
  message: string;
  files?: TAttachment[];
};

export const User: FC<TProps> = ({ message, files }) => {
  const hasFiles = files && files.length > 0;
  const hasMessage = message.trim().length > 0;

  if (!hasFiles && !hasMessage) return null;

  return (
    <div className="break-all flex flex-col items-end">
      {hasFiles && (
        <div className="flex flex-nowrap gap-2 mb-2 overflow-x-auto">
          {files.map((attachment) => (
            <FileItemPreview
              key={attachment.blobUrl || attachment.url || attachment.name}
              attachment={attachment}
            />
          ))}
        </div>
      )}

      {hasMessage && (
        <div className="rounded-[18px] bg-[#f4f4f4] text-[#2b2b2b] p-3 px-4 w-fit whitespace-pre-wrap text-wrap max-w-[535px]">
          {message}
        </div>
      )}
    </div>
  );
};
