import { FC, memo } from 'react';

import {
  ErrorMessage,
  Loading,
  MetaMessage,
  SystemMessage,
  UserMessage,
} from '@react/features/ai-chat/components';
import { MESSAGE_TYPES } from '@react/features/ai-chat/constants';
import { TChatMessage } from '@react/features/ai-chat/types';

import '../../styles/index.css';

interface IChatProps extends TChatMessage {
  avatar: string;
  onRetryClick?: () => void;
  scrollToBottom?: () => void;
}

export const Chat: FC<IChatProps> = memo((props) => {
  const { type, attachments, avatar, content, metaMessages, onRetryClick, scrollToBottom } = props;

  switch (type) {
    case MESSAGE_TYPES.USER:
      return <UserMessage message={content} files={attachments} />;
    case MESSAGE_TYPES.LOADING:
      return <Loading />;
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
