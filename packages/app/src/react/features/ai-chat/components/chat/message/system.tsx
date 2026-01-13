import { FC, useEffect } from 'react';

import { MarkdownRenderer } from '@react/features/ai-chat/components';
import { TMessageProps } from '@react/features/ai-chat/types';

type TProps = TMessageProps & { onUpdate?: () => void };

export const System: FC<TProps> = (props) => {
  const { message, onUpdate } = props || {};

  useEffect(() => {
    onUpdate?.();
  }, [message, onUpdate]);

  if (!message) return null;

  return (
    <div className="system-message-bubble relative chat-rich-text-response rounded-lg px-3 text-[#141414]">
      <MarkdownRenderer message={message} />
    </div>
  );
};
