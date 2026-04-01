import { FC, memo } from 'react';

import { Error, Info, Loading, Meta, System, User } from '@react/features/ai-chat/components';
import { MESSAGE_TYPES } from '@react/features/ai-chat/constants';
import { TChatMessage } from '@react/features/ai-chat/types';

interface IProps extends TChatMessage {
  avatar: string;
  retry?: () => void;
  scrollToBottom?: () => void;
}

export const Chat: FC<IProps> = memo((props) => {
  const { type, attachments, content, retry, ...metaMessage } = props;

  switch (type) {
    case MESSAGE_TYPES.USER:
      return <User message={content} attachments={attachments} />;
    case MESSAGE_TYPES.LOADING:
      return <Loading />;
    case MESSAGE_TYPES.SYSTEM:
      return <System message={content} onUpdate={props.scrollToBottom} />;
    case MESSAGE_TYPES.META:
      return <Meta {...metaMessage} />;
    case MESSAGE_TYPES.INFO:
      return <Info message={content} />;
    case MESSAGE_TYPES.ERROR:
      return <Error message={content} retry={retry} isRetryable={props.isRetryable} />;
    default:
      return <Error message="Something went wrong!" retry={retry} />;
  }
});
