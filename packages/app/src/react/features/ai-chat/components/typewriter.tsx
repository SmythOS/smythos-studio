import { FC, useCallback, useEffect, useState } from 'react';

import { MarkdownRenderer } from '@react/features/ai-chat/components';

interface ITypewriterProps {
  message: string;
  speed?: number;
  onComplete?: () => void;
  isTyping?: boolean;
  minSpeed?: number;
  maxSpeed?: number;
  onTypingProgress?: () => void;
}

/**
 * Typewriter component that displays text character by character with typing animation
 * Similar to ChatGPT's typing effect
 */
export const Typewriter: FC<ITypewriterProps> = ({
  message,
  speed = 5,
  onComplete,
  isTyping = true,
  minSpeed = 1,
  maxSpeed = 20,
  onTypingProgress,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastMessageLength, setLastMessageLength] = useState(0);

  // Calculate dynamic speed based on character type for ultra-fast professional typing
  const getTypingSpeed = useCallback(
    (char: string): number => {
      const baseSpeed = Math.max(minSpeed, Math.min(maxSpeed, speed));

      // Ultra-fast for all characters - professional speed
      if (char === ' ' || char === '\n') return baseSpeed * 0.1; // Almost instant
      if (/[a-zA-Z0-9]/.test(char)) return baseSpeed * 0.3; // Very fast
      if (/[.,!?;:]/.test(char)) return baseSpeed * 0.5; // Quick pause
      if (/[{}()[\]<>]/.test(char)) return baseSpeed * 0.2; // Very fast
      if (char === '\t') return baseSpeed * 0.1; // Almost instant
      if (/[#*`~]/.test(char)) return baseSpeed * 0.2; // Very fast for markdown

      return baseSpeed * 0.3; // Default fast speed
    },
    [minSpeed, maxSpeed, speed],
  );

  useEffect(() => {
    if (!isTyping) {
      setDisplayedText(message);
      setCurrentIndex(message.length);
      onComplete?.();
      return;
    }

    // Skip animation for very short messages (less than 20 characters) for instant display
    if (message.length < 20) {
      setDisplayedText(message);
      setCurrentIndex(message.length);
      onComplete?.();
      return;
    }

    if (currentIndex < message.length) {
      const currentChar = message[currentIndex];
      const dynamicSpeed = getTypingSpeed(currentChar);

      // Batch process multiple characters for ultra-fast typing
      const batchSize = currentChar === ' ' || currentChar === '\n' ? 3 : 1;
      const charsToAdd = message.slice(currentIndex, currentIndex + batchSize);

      const timer = setTimeout(() => {
        setDisplayedText((prevText) => prevText + charsToAdd);
        setCurrentIndex((prevIndex) => prevIndex + batchSize);
        // Trigger scroll during typing progress
        onTypingProgress?.();
      }, dynamicSpeed);

      return () => clearTimeout(timer);
    } else if (currentIndex >= message.length && displayedText.length === message.length) {
      onComplete?.();
    }
  }, [
    message,
    speed,
    currentIndex,
    displayedText.length,
    isTyping,
    onComplete,
    onTypingProgress,
    minSpeed,
    maxSpeed,
    getTypingSpeed,
  ]);

  // Reset only when message length decreases (new message) or when message is empty
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
      <MarkdownRenderer message={message} />
    </div>
  );
};
