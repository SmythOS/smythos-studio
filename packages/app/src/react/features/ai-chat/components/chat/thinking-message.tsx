import {
  createThinkingManager,
  formatStatusMessage,
} from '@src/react/features/ai-chat/utils/stream';
import { FC, useEffect, useRef, useState } from 'react';
import { IMetaMessages } from '../../types/chat';

interface IProps {
  data: {
    avatar?: string;
    metaMessages?: IMetaMessages;
  };
  scrollToBottom: () => void;
}

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

export const MetaMessage: FC<IProps> = ({ data, scrollToBottom }) => {
  const { avatar, metaMessages } = data;

  const [thinkingMessage, setThinkingMessage] = useState<string>('');
  const thinkingManagerRef = useRef(createThinkingManager());

  useEffect(() => {
    scrollToBottom?.();
  }, [scrollToBottom]);

  useEffect(() => {
    const manager = thinkingManagerRef.current;

    if (metaMessages?.statusMessage) {
      const formatted = formatStatusMessage(metaMessages.statusMessage);
      setThinkingMessage(formatted);
      manager.stop();
      return;
    }

    const toolName = metaMessages?.title || metaMessages?.functionCall?.name;
    manager.start(setThinkingMessage, toolName || '');

    return () => manager.stop();
  }, [metaMessages]);

  return (
    <>
      <style>{blinkAnimation}</style>
      <div className="flex items-center gap-3 px-3">
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

        <div className="flex-1">
          <span className="text-sm text-gray-500 font-medium smooth-blink-text">
            {thinkingMessage}
          </span>
        </div>
      </div>
    </>
  );
};
