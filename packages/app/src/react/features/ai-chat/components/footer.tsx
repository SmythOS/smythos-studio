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
  submitDisabled: boolean;
}

const CHAT_WARNING_INFO =
  "SmythOS can make mistakes, always check your work. We don't store chat history, save important work."; // eslint-disable-line quotes

export const Footer: FC<FooterProps> = (props) => {
  const { uploadError, clearError, queryInputRef, submitDisabled } = props;

  return (
    <>
      {uploadError.show && <ErrorToast message={uploadError.message} onClose={clearError} />}
      <QueryInput ref={queryInputRef} submitDisabled={submitDisabled} />
      <WarningInfo infoMessage={CHAT_WARNING_INFO} />
    </>
  );
};
