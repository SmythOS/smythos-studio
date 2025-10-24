import { FC } from 'react';

import {
  ReplyLoader,
  SystemMessage,
  ThinkingMessage,
  UserMessage,
} from '@react/features/ai-chat/components';
import { IChatMessage } from '@react/features/ai-chat/types/chat.types';

import '../styles/index.css';

interface IChatProps extends IChatMessage {
  scrollToBottom?: () => void; // Callback to scroll chat to bottom
}

/**
 * Chat Component
 * Renders appropriate message component based on message type and state
 *
 * @param props - Chat message properties
 * @returns Appropriate message component
 */
export const Chat: FC<IChatProps> = (props) => {
  const { type, files, avatar, message, onRetryClick, thinkingMessage, scrollToBottom } = props;

  switch (type) {
    case 'loading':
      return <ReplyLoader />;
    case 'thinking':
      return <ThinkingMessage message={message} avatar={avatar} />;
    case 'user':
      return <UserMessage message={message} files={files} />;
    case 'system':
      return (
        <SystemMessage
          avatar={avatar}
          message={message}
          typingAnimation
          thinkingMessage={thinkingMessage}
          onTypingComplete={() => scrollToBottom?.()}
          onTypingProgress={() => scrollToBottom?.()}
        />
      );
    case 'error':
      return <SystemMessage isError message={message} onRetryClick={onRetryClick} />;
    default:
      return <SystemMessage isError message="Something went wrong!" onRetryClick={onRetryClick} />;
  }
};
