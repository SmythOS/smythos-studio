import { Tooltip, TooltipContent, TooltipTrigger } from '@src/react/shared/components/ui/tooltip';
import { ChangeEvent, FC, RefObject, useCallback } from 'react';

import { AttachmentIcon } from '@react/features/ai-chat/components/common/icons';
import { CHAT_ACCEPTED_FILE_TYPES } from '@react/features/ai-chat/constants';
import { FILE_LIMITS } from '@react/features/ai-chat/utils/file';

interface IProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFilesAdd: (files: File[]) => void; // eslint-disable-line no-unused-vars
  isDisabled: boolean;
  isMaxFilesUploaded: boolean;
}

export const AttachmentButton: FC<IProps> = (props) => {
  const { fileInputRef, onFilesAdd, isDisabled, isMaxFilesUploaded } = props;

  const fileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.length) return;
      onFilesAdd(Array.from(e.target.files));
    },
    [onFilesAdd],
  );

  const handleClick = () => {
    if (fileInputRef?.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const button = (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled || isMaxFilesUploaded}
      className="text-gray-500 hover:text-gray-700 mr-2 transition-colors disabled:text-gray-300 disabled:cursor-not-allowed"
      title={!isMaxFilesUploaded ? 'Attach file' : undefined}
      aria-label="Attach file"
    >
      <AttachmentIcon />
    </button>
  );

  return (
    <>
      {/* Hidden file input for file selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={fileChange}
        accept={CHAT_ACCEPTED_FILE_TYPES.input}
        className="hidden"
        multiple
        aria-label="File attachment input"
        onClick={(e) => e.stopPropagation()}
      />
      {isMaxFilesUploaded ? (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="top">
            <p>{`You can only attach ${FILE_LIMITS.MAX_ATTACHED_FILES} files`}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </>
  );
};
