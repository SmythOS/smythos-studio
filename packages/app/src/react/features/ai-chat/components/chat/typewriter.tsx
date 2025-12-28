import { FC, useEffect, useRef, useState } from 'react';

import { MarkdownRenderer } from '@react/features/ai-chat/components';

type TProps = {
  message: string;
  onUpdate?: () => void;
};

export const Typewriter: FC<TProps> = ({ message, onUpdate }) => {
  const [displayedText, setDisplayedText] = useState('');
  const prevMessageLengthRef = useRef(0);

  useEffect(() => {
    // Reset detection: message got shorter or empty
    if (message.length < prevMessageLengthRef.current || message === '') {
      setDisplayedText('');
      prevMessageLengthRef.current = 0;
      return;
    }

    // Update displayed text and notify
    if (message.length > prevMessageLengthRef.current) {
      setDisplayedText(message);
      prevMessageLengthRef.current = message.length;
      onUpdate?.();
    }
  }, [message, onUpdate]);

  return (
    <div className="typewriter-content type-writer-text type-writer-inner w-full text-wrap">
      <MarkdownRenderer message={displayedText} />
    </div>
  );
};
