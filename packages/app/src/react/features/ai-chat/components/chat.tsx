import { FC } from 'react';

import {
  ReplyLoader,
  SystemMessage,
  ThinkingMessage,
  UserMessage,
} from '@react/features/ai-chat/components';
import { IChatMessage } from '@react/shared/types/chat.types';

import '../styles/index.css';

export const Chat: FC<IChatMessage> = ({
  me,
  files,
  avatar,
  message,
  type,
  isReplying,
  isRetrying,
  onRetryClick,
  isError = false,
  hideMessageBubble,
  thinkingMessage,
}) => {
  if (me) {
    return <UserMessage message={message} files={files} hideMessageBubble={hideMessageBubble} />;
  }

  // Handle thinking messages
  if (type === 'thinking') {
    return <ThinkingMessage message={message} avatar={avatar} />;
  }

  return isReplying || isRetrying ? (
    <ReplyLoader avatar={avatar} />
  ) : (
    <div className={me ? 'pl-[100px]' : ''}>
      {!hideMessageBubble && (
        <SystemMessage
          avatar={avatar}
          message={message}
          isError={isError}
          onRetryClick={onRetryClick}
          isRetrying={isRetrying}
          thinkingMessage={thinkingMessage}
        />
      )}
    </div>
  );
};
