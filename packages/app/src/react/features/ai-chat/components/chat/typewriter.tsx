import { FC, useEffect, useState } from 'react';

import { MarkdownRenderer } from '@react/features/ai-chat/components';
import { useChatStore } from '@react/features/ai-chat/hooks';

interface ITypewriterProps {
  message: string;
  onComplete?: () => void;
  isTyping?: boolean;
  minSpeed?: number;
  maxSpeed?: number;
  onTypingProgress?: () => void;
}

export const Typewriter: FC<ITypewriterProps> = ({
  message,
  onComplete,
  isTyping = true,
  minSpeed = 1,
  maxSpeed = 20,
  onTypingProgress,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastMessageLength, setLastMessageLength] = useState(0);
  const { isStreaming } = useChatStore('chat') || {};

  const TYPING_SPEED = 0;

  useEffect(() => {
    if (!isStreaming && message.length > 0) {
      setDisplayedText(message);
      setCurrentIndex(message.length);
      onComplete?.();
      return;
    }
  }, [isStreaming, message, onComplete]);

  useEffect(() => {
    if (!isTyping) {
      setDisplayedText(message);
      setCurrentIndex(message.length);
      onComplete?.();
      return;
    }

    if (message.length < 3) {
      setDisplayedText(message);
      setCurrentIndex(message.length);
      onComplete?.();
      return;
    }

    if (currentIndex < message.length) {
      const batchSize = message.length - currentIndex;
      const charsToAdd = message.slice(currentIndex, currentIndex + batchSize);

      const timer = setTimeout(() => {
        setDisplayedText((prevText) => prevText + charsToAdd);
        setCurrentIndex((prevIndex) => prevIndex + batchSize);
        onTypingProgress?.();
      }, TYPING_SPEED);

      return () => clearTimeout(timer);
    } else if (currentIndex >= message.length && displayedText.length === message.length) {
      onComplete?.();
    }
  }, [
    message,
    currentIndex,
    displayedText.length,
    isTyping,
    onComplete,
    onTypingProgress,
    minSpeed,
    maxSpeed,
    TYPING_SPEED,
  ]);

  useEffect(() => {
    if (message.length < lastMessageLength || message === '') {
      setDisplayedText('');
      setCurrentIndex(0);
      setLastMessageLength(0);
    } else if (message.length > lastMessageLength) {
      setLastMessageLength(message.length);
    }
  }, [message, lastMessageLength]);

  return (
    <div className="typewriter-content type-writer-text type-writer-inner w-full text-wrap">
      <MarkdownRenderer message={displayedText} />
    </div>
  );
};
