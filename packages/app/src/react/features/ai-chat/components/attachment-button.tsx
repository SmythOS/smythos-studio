import { Tooltip } from 'flowbite-react';
import { FC } from 'react';

import { FILE_LIMITS } from '@react/features/ai-chat/utils/file';

interface AttachmentButtonProps {
  onClick: () => void;
  fileAttachmentDisabled: boolean;
  isMaxFilesUploaded: boolean;
}

export const AttachmentButton: FC<AttachmentButtonProps> = ({
  onClick,
  fileAttachmentDisabled,
  isMaxFilesUploaded,
}) => {
  const button = (
    <button
      onClick={onClick}
      disabled={fileAttachmentDisabled}
      className="text-gray-500 hover:text-gray-700 mr-2 transition-colors"
      title={!isMaxFilesUploaded ? 'Attach file' : undefined}
      aria-label="Attach file"
    >
      <svg
        width="17"
        height="16"
        viewBox="0 0 17 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden="true"
      >
        <path
          d="M16.2056 8.33749L10.9576 13.5854C8.73264 15.8096 5.12529 15.8096 2.90114 13.5854C0.676184 11.3605 0.676184 7.75312 2.90114 5.52816L6.55545 1.87466C8.03339 0.395946 10.4291 0.395946 11.907 1.87466C13.3849 3.35176 13.3849 5.74832 11.907 7.22623L8.34251 10.7907C7.59626 11.5369 6.3871 11.5369 5.64086 10.7907C4.89462 10.0444 4.89462 8.83526 5.64086 8.08902L9.00457 4.72527"
          stroke="#424242"
          strokeWidth="1.24776"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  return isMaxFilesUploaded ? (
    <Tooltip
      content={`You can only attach ${FILE_LIMITS.MAX_ATTACHED_FILES} files`}
      placement="top"
    >
      {button}
    </Tooltip>
  ) : (
    button
  );
};
