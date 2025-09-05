import { FC } from 'react';

import {
  ReplyLoader,
  SystemMessage,
  ThinkingMessage,
  UserMessage,
} from '@react/features/ai-chat/components';
import { IChatMessage } from '@react/shared/types/chat.types';

import '../styles/index.css';

interface ChatProps extends IChatMessage {
  scrollToBottom?: () => void;
}

export const Chat: FC<ChatProps> = ({
  me,
  files,
  avatar,
  message,
  type,
  isReplying,
  isRetrying,
  onRetryClick,
  isError = false,
  hideMessage,
  thinkingMessage,
  scrollToBottom,
}) => {
  if (isReplying || isRetrying) return <ReplyLoader />;
  if (me && !hideMessage) return <UserMessage message={message} files={files} />;
  if (type === 'thinking') return <ThinkingMessage message={message} avatar={avatar} />;

  return (
    !hideMessage && (
      <SystemMessage
        avatar={avatar}
        message={message}
        isError={isError}
        onRetryClick={onRetryClick}
        isRetrying={isRetrying}
        thinkingMessage={thinkingMessage}
        onTypingProgress={() => scrollToBottom?.()}
        onTypingComplete={() => scrollToBottom?.()}
        typingAnimation={!isReplying && !isRetrying && !isError}
      />
    )
  );
};
