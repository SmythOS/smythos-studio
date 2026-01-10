import { ErrorToast, ScrollToBottomButton } from '@react/features/ai-chat/components';
import { useChatStores } from '@react/features/ai-chat/hooks';
import { FC } from 'react';
import ClaudeInput from './claude-input';

export const Footer: FC = () => {
  const { files, scroll } = useChatStores();
  const { errorMessage, clearError } = files;
  const { showScrollButton, scrollToBottom } = scroll || {};

  return (
    <div className="w-full max-w-4xl pt-5">
      {errorMessage && <ErrorToast message={errorMessage} onClose={clearError} />}
      <div className="relative">
        {showScrollButton && <ScrollToBottomButton onClick={() => scrollToBottom()} />}
        <ClaudeInput />
        {/* <GptInput /> */}
        {/* <ChatInput /> */}
      </div>

      <h6 className="py-4 text-center text-xs text-gray-500">
        SmythOS can make mistakes, always check your work. We don&apos;t store chat history, save
        important work.
      </h6>
    </div>
  );
};
