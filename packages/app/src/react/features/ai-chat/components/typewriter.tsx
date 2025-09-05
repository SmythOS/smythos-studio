import { FC, useCallback, useEffect, useState } from 'react';

import { MarkdownRenderer } from '@react/features/ai-chat/components';
import { forceScrollToBottom } from '@react/features/ai-chat/utils/scroll-utils';
import { useChatContext } from '../contexts';

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
  const { isGenerating = true } = useChatContext();

  // Fast typewriter-effect library style speed
  const getTypingSpeed = useCallback((char: string, messageLength: number): number => {
    // Very fast base speed like typewriter-effect library
    let baseSpeed = 20; // 20ms base speed (very fast)

    // Character-specific speeds (minimal variation for smoothness)
    if (char === ' ' || char === '\n') {
      baseSpeed = 10; // Almost instant for spaces
    } else if (/[a-zA-Z0-9]/.test(char)) {
      baseSpeed = 15; // Very fast for letters/numbers
    } else if (/[.,!?;:]/.test(char)) {
      baseSpeed = 25; // Slight pause for punctuation
    } else if (/[{}()[\]<>]/.test(char)) {
      baseSpeed = 12; // Fast for brackets
    } else if (char === '\t') {
      baseSpeed = 8; // Very fast for tabs
    } else if (/[#*`~]/.test(char)) {
      baseSpeed = 18; // Fast for markdown
    }

    // Add tiny random variation for natural feel (like typewriter-effect)
    const variation = (Math.random() - 0.5) * 8; // ±4ms variation
    baseSpeed += variation;

    // Slightly faster for longer messages (like typewriter-effect)
    if (messageLength > 200) {
      baseSpeed *= 0.8;
    }
    if (messageLength > 500) {
      baseSpeed *= 0.7;
    }
    if (messageLength > 1000) {
      baseSpeed *= 0.6;
    }

    return Math.max(5, baseSpeed); // Minimum 5ms for ultra-smoothness
  }, []);

  // Handle immediate display when generation is complete
  useEffect(() => {
    if (!isGenerating && message.length > 0) {
      // When generation is complete, show all content immediately
      setDisplayedText(message);
      setCurrentIndex(message.length);

      onComplete?.();
      return;
    }
  }, [isGenerating, message, onComplete]);

  // Separate effect for force scroll only when generation completes
  useEffect(() => {
    if (!isGenerating && message.length > 0) {
      // Force scroll to bottom when message is fully generated (ignores user scroll position)

      // Add a small delay to ensure the content is fully rendered
      setTimeout(() => {
        forceScrollToBottom({ behavior: 'smooth', delay: 0 });
      }, 200);
    }
  }, [isGenerating]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isTyping) {
      setDisplayedText(message);
      setCurrentIndex(message.length);
      onComplete?.();
      return;
    }

    // Skip animation only for very short messages (less than 3 characters) for instant display
    if (message.length < 3) {
      setDisplayedText(message);
      setCurrentIndex(message.length);
      onComplete?.();
      return;
    }

    if (currentIndex < message.length) {
      const currentChar = message[currentIndex];
      const dynamicSpeed = getTypingSpeed(currentChar, message.length);

      // Fast typewriter-effect style batching for smooth performance
      let batchSize = 1;

      // Smart batching based on message length (like typewriter-effect library)
      if (message.length > 2000) {
        batchSize = currentChar === ' ' || currentChar === '\n' ? 8 : 3;
      } else if (message.length > 1000) {
        batchSize = currentChar === ' ' || currentChar === '\n' ? 6 : 2;
      } else if (message.length > 500) {
        batchSize = currentChar === ' ' || currentChar === '\n' ? 4 : 2;
      } else if (message.length > 200) {
        batchSize = currentChar === ' ' || currentChar === '\n' ? 3 : 1;
      } else {
        batchSize = currentChar === ' ' || currentChar === '\n' ? 2 : 1;
      }

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
      <MarkdownRenderer message={displayedText} />
    </div>
  );
};
