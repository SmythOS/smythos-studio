import {
  ChatInput,
  ErrorToast,
  ChatInputRef,
  WarningInfo,
} from '@react/features/ai-chat/components';
import { FC, RefObject } from 'react';

interface FooterProps {
  uploadError: { show: boolean; message: string };
  clearError: () => void;
  chatInputRef: RefObject<ChatInputRef>;
  submitDisabled: boolean;
}

const CHAT_WARNING_INFO =
  "SmythOS can make mistakes, always check your work. We don't store chat history, save important work."; // eslint-disable-line quotes

export const Footer: FC<FooterProps> = (props) => {
  const { uploadError, clearError, chatInputRef, submitDisabled } = props;

  return (
    <div className="w-full max-w-4xl">
      {uploadError.show && <ErrorToast message={uploadError.message} onClose={clearError} />}
      <ChatInput ref={chatInputRef} submitDisabled={submitDisabled} />
      <WarningInfo infoMessage={CHAT_WARNING_INFO} />
    </div>
  );
};
