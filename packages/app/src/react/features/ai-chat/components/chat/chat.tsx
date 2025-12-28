import { FC, memo } from 'react';

import { Error, Loading, Meta, System, User } from '@react/features/ai-chat/components';
import { MESSAGE_TYPES } from '@react/features/ai-chat/constants';
import { TChatMessage } from '@react/features/ai-chat/types';

interface IProps extends TChatMessage {
  avatar: string;
  retry?: () => void;
  scrollToBottom?: () => void;
}

export const Chat: FC<IProps> = memo((props) => {
  const { type, attachments, avatar, content, metaMessages, retry, scrollToBottom } = props;

  switch (type) {
    case MESSAGE_TYPES.USER:
      return <User message={content} files={attachments} />;
    case MESSAGE_TYPES.LOADING:
      return <Loading />;
    case MESSAGE_TYPES.META:
      return <Meta data={{ avatar, metaMessages }} scrollToBottom={scrollToBottom} />;
    case MESSAGE_TYPES.SYSTEM:
      return <System message={content} onUpdate={scrollToBottom} />;
    case MESSAGE_TYPES.ERROR:
      return <Error message={content} onRetryClick={retry} />;
    default:
      return <Error message="Something went wrong!" onRetryClick={retry} />;
  }
});
