import { FC, useRef } from 'react';

import { MarkdownRenderer, Typewriter } from '@react/features/ai-chat/components';

interface ISystemMessageProps {
  message: string;
  typingAnimation?: boolean;
  scrollToBottom?: () => void;
}

export const SystemMessage: FC<ISystemMessageProps> = (props) => {
  const { message, scrollToBottom, typingAnimation = true } = props;

  const contentRef = useRef<HTMLDivElement>(null);

  if (!message) return null; // if message is empty, return null

  return (
    <div
      ref={contentRef}
      className="system-message-bubble relative chat-rich-text-response rounded-lg px-3 text-[#141414]"
    >
      {typingAnimation ? (
        <Typewriter
          message={message}
          isTyping={typingAnimation}
          onComplete={scrollToBottom}
          onTypingProgress={scrollToBottom}
        />
      ) : (
        <MarkdownRenderer message={message} />
      )}
    </div>
  );
};
