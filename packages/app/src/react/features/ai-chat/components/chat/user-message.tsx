import { FC } from 'react';
import { IAttachment } from '../../types/chat';
import { FileItemPreview } from '../common/FileItemPreview';

interface IProps {
  message: string;
  files?: IAttachment[];
}

export const UserMessage: FC<IProps> = ({ message, files }) => {
  const hasFiles = files && files.length > 0;

  return (
    <div className="break-all flex flex-col items-end">
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

      {message && (
        <div className="rounded-[18px] bg-[#f4f4f4] text-[#2b2b2b] p-3 px-4 w-fit whitespace-pre-wrap text-wrap max-w-[535px]">
          {message}
        </div>
      )}
    </div>
  );
};
