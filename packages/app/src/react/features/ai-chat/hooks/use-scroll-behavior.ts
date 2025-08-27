import { useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook for scroll behavior (inspired by ChatBox functionality)
 * Manages chat scroll behavior, auto-scroll, and user scroll detection
 * @param messages - Array of chat messages
 * @param hasUserScrolled - Whether user has manually scrolled
 * @param setHasUserScrolled - Function to set user scroll state
 */
export const useScrollBehavior = (
  messages: any[],
  hasUserScrolled: boolean,
  setHasUserScrolled: (value: boolean) => void,
) => {
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /**
   * Scrolls to the bottom of the chat with smooth animation
   */
  const scrollToBottom = useCallback((): void => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  /**
   * Handles scroll events to detect user scrolling
   */
  const handleScroll = useCallback(
    (event: Event): void => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const { scrollTop, scrollHeight, clientHeight } = target;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;

      if (!isAtBottom && !hasUserScrolled) {
        setHasUserScrolled(true);
      } else if (isAtBottom && hasUserScrolled) {
        setHasUserScrolled(false);
      }
    },
    [hasUserScrolled, setHasUserScrolled],
  );

  /**
   * Auto-scroll to bottom when new messages arrive (if user hasn't scrolled up)
   */
  useEffect(() => {
    if (!hasUserScrolled) {
      scrollToBottom();
    }
  }, [messages, hasUserScrolled, scrollToBottom]);

  /**
   * Add scroll event listener to chat container
   */
  useEffect(() => {
    const chatContainer = chatBoxRef.current;
    if (!chatContainer) return;

    chatContainer.addEventListener('scroll', handleScroll);

    return () => {
      chatContainer.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return {
    chatBoxRef,
    chatEndRef,
    scrollToBottom,
    handleScroll,
  };
};
