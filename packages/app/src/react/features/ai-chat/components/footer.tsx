import {
  ErrorToast,
  QueryInput,
  QueryInputRef,
  WarningInfo,
} from '@react/features/ai-chat/components';
import { FC, RefObject } from 'react';

interface FooterProps {
  uploadError: { show: boolean; message: string };
  clearError: () => void;
  queryInputRef: RefObject<QueryInputRef>;
  isChatCreating: boolean;
  isAgentLoading: boolean;
  uploadingFiles: { size: number };
}

const CHAT_WARNING_INFO =
  "SmythOS can make mistakes, always check your work. We don't store chat history, save important work."; // eslint-disable-line quotes

export const Footer: FC<FooterProps> = (props) => {
  const { uploadError, clearError, queryInputRef, isChatCreating, isAgentLoading, uploadingFiles } =
    props;

  return (
    <>
      {uploadError.show && <ErrorToast message={uploadError.message} onClose={clearError} />}
      <div className="pt-2.5" />
      <QueryInput
        ref={queryInputRef}
        submitDisabled={isChatCreating || isAgentLoading || uploadingFiles.size > 0}
      />
      <WarningInfo infoMessage={CHAT_WARNING_INFO} />
    </>
  );
};
