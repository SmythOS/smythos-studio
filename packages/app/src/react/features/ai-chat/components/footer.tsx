import { ChatInput, ErrorToast, ScrollToBottomButton } from '@react/features/ai-chat/components';
import { useChatStores } from '@react/features/ai-chat/hooks';
import { FC, useCallback } from 'react';

const CHAT_WARNING_INFO =
  "SmythOS can make mistakes, always check your work. We don't store chat history, save important work."; // eslint-disable-line quotes

export const Footer: FC = () => {
  const { files, scroll } = useChatStores();
  const { errorMessage, setErrorMessage } = files;
  const { showScrollButton, scrollToBottom } = scroll || {};

  const onClose = useCallback(() => setErrorMessage(''), [setErrorMessage]);
  const onScrollToBottom = useCallback(() => scrollToBottom(true), [scrollToBottom]);

  return (
    <div className="w-full max-w-4xl pt-2.5">
      {errorMessage && <ErrorToast message={errorMessage} onClose={onClose} />}
      <div className="relative">
        {showScrollButton && <ScrollToBottomButton onClick={onScrollToBottom} />}
        <ChatInput />
      </div>

      <h6 className="py-4 text-center text-xs text-gray-500">{CHAT_WARNING_INFO}</h6>
    </div>
  );
};
