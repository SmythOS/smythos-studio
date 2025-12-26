import { FC } from 'react';
import { IAttachment } from '../types/chat';
import { FileItemPreview } from './FileItemPreview';

/**
 * User Message Component Properties
 */
interface IUserMessage {
  message: string;
  files?: IAttachment[];
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
          {files.map((attachment, index) => (
            <FileItemPreview
              key={`${attachment.name}-${index}-${attachment.url || attachment.blobUrl || index}`}
              attachment={attachment}
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
