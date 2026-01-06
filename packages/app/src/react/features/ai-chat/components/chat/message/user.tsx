import { FileItemPreview } from '@react/features/ai-chat/components';
import { TAttachment, TMessageProps } from '@react/features/ai-chat/types';
import { FC } from 'react';

type TProps = TMessageProps & { attachments?: TAttachment[] };

export const User: FC<TProps> = ({ message, attachments }) => {
  const hasAttachments = attachments && attachments.length > 0;
  const hasMessage = message.trim().length > 0;

  if (!hasAttachments && !hasMessage) return null;

  return (
    <div className="break-all flex flex-col items-end">
      {hasAttachments && (
        <div className="flex flex-nowrap gap-2 mb-2 overflow-x-auto">
          {attachments.map((attachment) => (
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
