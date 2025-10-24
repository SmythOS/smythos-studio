import {
  ChatInput,
  ChatInputRef,
  ErrorToast,
  ScrollToBottomButton,
  WarningInfo,
} from '@react/features/ai-chat/components';
import { FC, RefObject } from 'react';

interface FooterProps {
  uploadError: { show: boolean; message: string };
  clearError: () => void;
  chatInputRef: RefObject<ChatInputRef>;
  submitDisabled: boolean;
  showScrollButton: boolean;
  scrollToBottom: (smooth?: boolean) => void; // eslint-disable-line no-unused-vars
}

const CHAT_WARNING_INFO =
  "SmythOS can make mistakes, always check your work. We don't store chat history, save important work."; // eslint-disable-line quotes

export const Footer: FC<FooterProps> = (props) => {
  const {
    chatInputRef,
    uploadError,
    clearError,
    submitDisabled,
    showScrollButton,
    scrollToBottom,
  } = props;

  return (
    <div className="w-full max-w-4xl">
      {uploadError.show && <ErrorToast message={uploadError.message} onClose={clearError} />}
      <div className="relative">
        {showScrollButton && <ScrollToBottomButton onClick={() => scrollToBottom(true)} />}
        <ChatInput ref={chatInputRef} submitDisabled={submitDisabled} />
      </div>
      <WarningInfo infoMessage={CHAT_WARNING_INFO} />
    </div>
  );
};
