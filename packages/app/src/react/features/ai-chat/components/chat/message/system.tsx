import { FC } from 'react';

import { MarkdownRenderer, Typewriter } from '@react/features/ai-chat/components';

type TProps = {
  message: string;
  enableTypewriter?: boolean;
  onUpdate?: () => void;
};

export const System: FC<TProps> = ({ message, onUpdate, enableTypewriter = true }) => {
  if (!message) return null;

  return (
    <div className="system-message-bubble relative chat-rich-text-response rounded-lg px-3 text-[#141414]">
      {enableTypewriter ? (
        <Typewriter message={message} onUpdate={onUpdate} />
      ) : (
        <MarkdownRenderer message={message} />
      )}
    </div>
  );
};
