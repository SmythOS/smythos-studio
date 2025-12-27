import { FC, memo } from 'react';

import {
  ErrorMessage,
  MetaMessage,
  ReplyLoader,
  SystemMessage,
  UserMessage,
} from '@react/features/ai-chat/components';

import { MESSAGE_TYPES } from '../../constants';
import '../../styles/index.css';
import { IMessage } from '../../types/chat';

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
    case MESSAGE_TYPES.USER:
      return <UserMessage message={content} files={attachments} />;
    case MESSAGE_TYPES.LOADING:
      return <ReplyLoader />;
    case MESSAGE_TYPES.META:
      return <MetaMessage data={{ avatar, metaMessages }} scrollToBottom={scrollToBottom} />;
    case MESSAGE_TYPES.SYSTEM:
      return <SystemMessage message={content} scrollToBottom={scrollToBottom} />;
    case MESSAGE_TYPES.ERROR:
      return <ErrorMessage message={content} onRetryClick={onRetryClick} />;
    default:
      return <ErrorMessage message="Something went wrong!" onRetryClick={onRetryClick} />;
  }
});
