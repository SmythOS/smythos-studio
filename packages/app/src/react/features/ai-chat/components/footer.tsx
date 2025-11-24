import { ChatInput, ErrorToast, ScrollToBottomButton } from '@react/features/ai-chat/components';
import { useChatStores } from '@react/features/ai-chat/hooks';
import { FC } from 'react';

const CHAT_WARNING_INFO =
  "SmythOS can make mistakes, always check your work. We don't store chat history, save important work."; // eslint-disable-line quotes

export const Footer: FC = () => {
  const {
    files: { errorMessage, clearError },
    scroll: { showScrollButton, scrollToBottom },
  } = useChatStores();

  return (
    <div className="w-full max-w-4xl pt-2.5">
      {errorMessage && <ErrorToast message={errorMessage} onClose={clearError} />}
      <div className="relative">
        {showScrollButton && <ScrollToBottomButton onClick={() => scrollToBottom(true)} />}
        <ChatInput />
      </div>

      <h6 className="py-4 text-center text-xs text-gray-500">{CHAT_WARNING_INFO}</h6>
    </div>
  );
};
