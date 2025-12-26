import { FC, memo } from 'react';

import {
  ErrorMessage,
  ReplyLoader,
  SystemMessage,
  ThinkingMessage,
  UserMessage,
} from '@react/features/ai-chat/components';

import '../styles/index.css';
import { IMessage } from '../types/chat';

interface IChatProps extends IMessage {
  avatar: string;
  onRetryClick?: () => void;
  scrollToBottom?: () => void;
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
  const { type, attachments, avatar, content, metaMessages, onRetryClick, scrollToBottom } = props;

  switch (type) {
    case 'loading':
      return <ReplyLoader />;
    case 'meta':
      return <ThinkingMessage avatar={avatar} metaMessages={metaMessages} />;
    case 'user':
      return <UserMessage message={content} files={attachments} />;
    case 'system':
      return <SystemMessage message={content} scrollToBottom={scrollToBottom} />;
    case 'error':
      return <ErrorMessage message={content} onRetryClick={onRetryClick} />;
    default:
      return <ErrorMessage message="Something went wrong!" onRetryClick={onRetryClick} />;
  }
});
