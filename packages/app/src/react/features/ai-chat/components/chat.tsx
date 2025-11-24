import { FC, memo } from 'react';

import {
  ErrorMessage,
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
 * Chat Component (Memoized for Performance)
 * Renders appropriate message component based on message type and state
 *
 * Memoization prevents unnecessary re-renders of unchanged messages
 * Critical for performance in long conversations (100+ messages)
 *
 * @param props - Chat message properties
 * @returns Appropriate message component
 */
export const Chat: FC<IChatProps> = memo((props) => {
  const { type, files, avatar, message, metaMessages, onRetryClick, scrollToBottom } = props;

  switch (type) {
    case 'loading':
      return <ReplyLoader />;
    case 'thinking':
      return <ThinkingMessage avatar={avatar} metaMessages={metaMessages} />;
    case 'user':
      return <UserMessage message={message} files={files} />;
    case 'system':
      return <SystemMessage message={message} scrollToBottom={scrollToBottom} />;
    case 'error':
      return <ErrorMessage message={message} onRetryClick={onRetryClick} />;
    default:
      return <ErrorMessage message="Something went wrong!" onRetryClick={onRetryClick} />;
  }
});
