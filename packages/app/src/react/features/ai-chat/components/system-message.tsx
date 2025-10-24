import { FC, useRef } from 'react';

import {
  ErrorMessage,
  MarkdownRenderer,
  ThinkingMessage,
  Typewriter,
} from '@react/features/ai-chat/components';

interface ISystemMessageProps {
  message: string;
  avatar?: string;
  isError?: boolean;
  isRetrying?: boolean;
  onRetryClick?: () => void;
  thinkingMessage?: string;
  typingAnimation?: boolean;
  onTypingComplete?: () => void;
  onTypingProgress?: () => void;
}

export const SystemMessage: FC<ISystemMessageProps> = (props) => {
  const {
    avatar,
    message,
    isError,
    isRetrying,
    onRetryClick,
    thinkingMessage,
    onTypingComplete,
    onTypingProgress,
    typingAnimation = true,
  } = props;

  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="system-message-bubble relative">
      {isError ? (
        <ErrorMessage message={message} onRetryClick={onRetryClick} isRetrying={isRetrying} />
      ) : (
        <div
          ref={contentRef}
          className="chat-rich-text-response space-y-1 rounded-lg px-3 text-[#141414]"
        >
          {typingAnimation ? (
            <Typewriter
              message={message}
              speed={2}
              isTyping={typingAnimation}
              onComplete={onTypingComplete}
              onTypingProgress={onTypingProgress}
            />
          ) : (
            <MarkdownRenderer message={message} />
          )}

          {/* Display thinking message inline if present */}
          {thinkingMessage && <ThinkingMessage message={thinkingMessage} avatar={avatar} />}
        </div>
      )}
    </div>
  );
};
