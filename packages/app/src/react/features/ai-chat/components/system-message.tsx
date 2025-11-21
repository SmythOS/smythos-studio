import { FC, useRef } from 'react';

import { ErrorMessage, MarkdownRenderer, Typewriter } from '@react/features/ai-chat/components';

interface ISystemMessageProps {
  message: string;
  isError?: boolean;
  isRetrying?: boolean;
  onRetryClick?: () => void;
  typingAnimation?: boolean;
  onTypingComplete?: () => void;
  onTypingProgress?: () => void;
}

export const SystemMessage: FC<ISystemMessageProps> = (props) => {
  const {
    message,
    isError,
    isRetrying,
    onRetryClick,
    onTypingComplete,
    onTypingProgress,
    typingAnimation = true,
  } = props;

  const contentRef = useRef<HTMLDivElement>(null);

  if (!message) return null; // if message is empty, return null

  return (
    <div className="system-message-bubble relative">
      {isError ? (
        <ErrorMessage message={message} onRetryClick={onRetryClick} isRetrying={isRetrying} />
      ) : (
        <div ref={contentRef} className="chat-rich-text-response rounded-lg px-3 text-[#141414]">
          {typingAnimation ? (
            <Typewriter
              message={message}
              isTyping={typingAnimation}
              onComplete={onTypingComplete}
              onTypingProgress={onTypingProgress}
            />
          ) : (
            <MarkdownRenderer message={message} />
          )}
        </div>
      )}
    </div>
  );
};
