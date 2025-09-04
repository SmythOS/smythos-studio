import { FileWithMetadata } from '@react/shared/types/chat.types';
import { FC } from 'react';
import { FileItemPreview } from '@react/features/ai-chat/components';

interface IUserMessageBubble {
  message: string;
  files?: FileWithMetadata[];
  hideMessageBubble?: boolean;
}

export const UserMessage: FC<IUserMessageBubble> = ({ message, files, hideMessageBubble }) => {
  return (
    <div className="break-all flex flex-col items-end">
      {files && files.length > 0 && (
        <div className="flex flex-nowrap gap-2 mb-2 overflow-x-auto">
          {files.map((fileWithKey, index) => (
            <FileItemPreview
              isReadOnly
              key={index}
              file={fileWithKey}
              fileKey={fileWithKey.metadata.key}
              inChatBubble={true}
            />
          ))}
        </div>
      )}
      {!hideMessageBubble && message && (
        <div className="rounded-[18px] bg-[#f4f4f4] text-[#2b2b2b] p-3 px-4 w-fit whitespace-pre-wrap text-wrap max-w-[535px]">
          {message}
        </div>
      )}
    </div>
  );
};
