import { FC, useEffect, useState } from 'react';

import { MarkdownRenderer } from '@react/features/ai-chat/components';
import { useChatContext } from '../contexts';

interface ITypewriterProps {
  message: string;
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

  /**
   * PERFORMANCE OPTIMIZATION:
   * Instant streaming display without artificial typing delay
   *
   * Previous issue: 1 character per 1ms = 1000ms for 1000 chars
   * Solution: Instant display as chunks arrive (0ms delay)
   *
   * Result: Real-time streaming like ChatGPT
   */
  const TYPING_SPEED = 0; // Zero delay - truly instant display

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

  /**
   * SCROLL OPTIMIZATION:
   * Removed duplicate scroll trigger from typewriter
   *
   * Reason: chats.tsx already handles scrolling with smartScrollToBottom
   * Having multiple scroll triggers causes conflicts and inconsistent behavior
   *
   * The main scroll logic in chats.tsx is more intelligent:
   * - Respects user scroll position (shouldAutoScroll)
   * - Tracks message changes properly
   * - Works consistently across all scenarios
   */
  // REMOVED: Duplicate scroll logic (handled by chats.tsx)

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
      /**
       * PERFORMANCE OPTIMIZATION:
       * Display entire new content instantly instead of character-by-character
       *
       * Previous: 1 char at a time = 1000 updates for 1000 chars
       * Now: All new content at once = 1 update
       *
       * This gives instant streaming display as chunks arrive from server
       */
      const batchSize = message.length - currentIndex; // Display all remaining content instantly

      const charsToAdd = message.slice(currentIndex, currentIndex + batchSize);

      const timer = setTimeout(() => {
        setDisplayedText((prevText) => prevText + charsToAdd);
        setCurrentIndex((prevIndex) => prevIndex + batchSize);
        // Trigger scroll during typing progress
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
