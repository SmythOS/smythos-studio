import {
  createThinkingManager,
  formatStatusMessage,
} from '@react/features/ai-chat/utils/stream.utils';
import { FC, useEffect, useRef, useState } from 'react';
import { IMetaMessages } from '../types/chat';

interface IProps {
  data: {
    avatar?: string;
    metaMessages?: IMetaMessages;
  };
  scrollToBottom: () => void;
}

// Custom CSS for smooth blinking animation (like the image)
const blinkAnimation = `
  @keyframes smoothBlink {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
  }
  .smooth-blink-text {
    animation: smoothBlink 1.5s ease-in-out infinite;
    color: #6b7280;
    font-weight: 500;
  }
`;

/**
 * ThinkingMessage Component
 * Manages thinking message cycling internally using ThinkingMessageManager
 * Receives metaMessages from parent and handles the cycling logic
 */
export const MetaMessage: FC<IProps> = ({ data, scrollToBottom }) => {
  const { avatar, metaMessages } = data;

  const [thinkingMessage, setThinkingMessage] = useState<string>('');
  const thinkingManagerRef = useRef(createThinkingManager());
  // thinking-message.tsx
  useEffect(() => {
    scrollToBottom?.();
  }, [scrollToBottom]);

  /**
   * Effect to manage thinking message lifecycle
   * Starts/updates cycling when metaMessages are received
   * The ThinkingMessageManager handles priority internally (status > tools > general)
   * Stops when component unmounts
   */
  useEffect(() => {
    const manager = thinkingManagerRef.current;

    // Check if statusMessage exists - if yes, just display formatted, no cycling
    if (metaMessages?.statusMessage) {
      // Format and display statusMessage directly, no thinkingManager needed
      const formatted = formatStatusMessage(metaMessages.statusMessage);
      setThinkingMessage(formatted);
      manager.stop(); // Stop any existing cycling
      return;
    }

    // No statusMessage, check for toolName
    const toolName = metaMessages?.title || metaMessages?.functionCall?.name;

    manager.start(setThinkingMessage, toolName || '');

    // Cleanup: stop thinking manager when component unmounts
    return () => manager.stop();
  }, [metaMessages]);

  return (
    <>
      <style>{blinkAnimation}</style>
      {/* White rectangular bubble like the image */}

      <div className="flex items-center gap-3 px-3">
        {/* Avatar inside the bubble */}
        <div className="flex-shrink-0">
          <div className="size-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="AI Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">AI</span>
              </div>
            )}
          </div>
        </div>

        {/* Message text inside the bubble */}
        <div className="flex-1">
          <span className="text-sm text-gray-500 font-medium smooth-blink-text">
            {thinkingMessage}
          </span>
        </div>
      </div>
    </>
  );
};
