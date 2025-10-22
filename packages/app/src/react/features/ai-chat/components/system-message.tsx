import { Tooltip } from 'flowbite-react';
import { FC, useRef, useState } from 'react';
import { FaCheck, FaRegCopy } from 'react-icons/fa6';

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
  showCopyButton?: boolean; // Control copy button visibility (default: true)
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
    showCopyButton = true, // Default to true for backward compatibility
  } = props;
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (contentRef.current) {
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err); // eslint-disable-line no-console
      }

      selection?.removeAllRanges();
    }
  };

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

          {!isError && !thinkingMessage && showCopyButton && (
            <div className="pt-2.5">
              <Tooltip content={copied ? 'Copied!' : 'Copy'} placement="bottom">
                <button
                  onClick={handleCopy}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {copied ? <FaCheck /> : <FaRegCopy />}
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
