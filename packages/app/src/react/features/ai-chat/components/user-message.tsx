import { FileItemPreview } from '@react/features/ai-chat/components';
import { IMessageFile } from '@react/features/ai-chat/types/chat.types';
import { FC } from 'react';

/**
 * User Message Component Properties
 */
interface IUserMessage {
  message: string;
  files?: IMessageFile[];
}

/**
 * User Message Component
 * Displays user's message with optional file attachments
 * Message bubble automatically hidden if message is empty
 */
export const UserMessage: FC<IUserMessage> = ({ message, files }) => {
  const hasFiles = files && files.length > 0;

  return (
    <div className="break-all flex flex-col items-end">
      {/* File Attachments */}
      {hasFiles && (
        <div className="flex flex-nowrap gap-2 mb-2 overflow-x-auto">
          {files.map((fileWithKey, index) => (
            <FileItemPreview
              isReadOnly
              key={fileWithKey.id || index}
              file={fileWithKey}
              fileKey={fileWithKey.metadata.key}
              inChatBubble={true}
            />
          ))}
        </div>
      )}

      {/* Message Bubble - automatically hidden if empty */}
      {message && (
        <div className="rounded-[18px] bg-[#f4f4f4] text-[#2b2b2b] p-3 px-4 w-fit whitespace-pre-wrap text-wrap max-w-[535px]">
          {message}
        </div>
      )}
    </div>
  );
};
