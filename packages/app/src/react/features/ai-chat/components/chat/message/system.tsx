import { FC, useEffect, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { FaRegCopy } from 'react-icons/fa6';

import { MarkdownRenderer } from '@react/features/ai-chat/components';
import { TMessageProps } from '@react/features/ai-chat/types';

type TProps = TMessageProps & { onUpdate?: () => void };

export const System: FC<TProps> = (props) => {
  const { message, onUpdate } = props || {};
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    onUpdate?.();
  }, [message, onUpdate]);

  const handleCopy = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Silently fail - user can retry
    }
  };

  if (!message) return null;

  return (
    <div className="system-message-bubble relative chat-rich-text-response rounded-lg px-3 text-[#141414] group">
      <MarkdownRenderer message={message} />
      <button
        onClick={handleCopy}
        className="absolute -bottom-5 left-2 p-1.5 rounded-md text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity"
        title={isCopied ? 'Copied!' : 'Copy response'}
        aria-label={isCopied ? 'Copied!' : 'Copy response'}
      >
        {isCopied ? <FaCheck className="size-4" /> : <FaRegCopy className="size-4" />}
      </button>
    </div>
  );
};
