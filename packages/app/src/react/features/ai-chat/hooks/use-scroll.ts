import { RefObject, useCallback, useEffect, useState } from 'react';

import { scrollManager } from '@react/features/ai-chat/utils';

/**
 * Hook for managing scroll-to-bottom behavior in chat interface
 *
 * @param ref - Reference to the scrollable container element
 * @returns Scroll state and control functions
 */
export const useScrollToBottom = (ref: RefObject<HTMLElement>) => {
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Initialize scroll manager with container reference
  useEffect(() => {
    if (ref.current) scrollManager.init(ref.current);
  }, [ref]);

  /**
   * Handles scroll events to determine if scroll button should be shown
   * Ignores scroll events when user has text selected
   */
  const handleScroll = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    if (ref.current) {
      const { scrollTop, scrollHeight, clientHeight } = ref.current;
      const distanceFromBottom = Math.ceil(scrollHeight - scrollTop - clientHeight);
      const threshold = 200;
      const isScrolledUp = distanceFromBottom > threshold;
      setShowScrollButton(isScrolledUp);
    }
  }, [ref]);

  /**
   * Force scrolls to bottom regardless of current position
   * Used for user-initiated scroll actions (button clicks)
   */
  const scrollToBottom = useCallback((smooth: boolean = true) => {
    scrollManager.forceScrollToBottomImmediate({
      behavior: smooth ? 'smooth' : 'auto',
      delay: 0,
    });
  }, []);

  /**
   * Smart scroll that respects user's scroll position
   * Only scrolls if user is near bottom (within 200px threshold)
   * Used for content updates during streaming
   */
  const smartScrollToBottom = useCallback((smooth: boolean = true) => {
    scrollManager.smartScrollToBottom({ behavior: smooth ? 'smooth' : 'auto', delay: 0 });
  }, []);

  /**
   * Hides the scroll button
   * Used when resetting chat session
   */
  const hideScrollButton = useCallback(() => setShowScrollButton(false), []);

  // Attach scroll event listener
  useEffect(() => {
    const container = ref.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [ref, handleScroll]);

  return {
    showScrollButton,
    handleScroll,
    scrollToBottom,
    smartScrollToBottom,
    hideScrollButton,
  };
};
