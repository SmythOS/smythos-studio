import { RefObject, useCallback, useEffect, useState } from 'react';

import { scrollManager } from '@react/features/ai-chat/utils/scroll-utils';

export const useScrollToBottom = (ref: RefObject<HTMLElement>) => {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Initialize scroll manager with container
  useEffect(() => {
    if (ref.current) {
      scrollManager.init(ref.current);
    }
  }, [ref]);

  const handleScroll = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    if (ref.current) {
      const { scrollTop, scrollHeight, clientHeight } = ref.current;

      /**
       * ULTRA-AGGRESSIVE THRESHOLD: Maximum scroll retention
       *
       * Problem: Even 150px was too strict for smooth streaming
       *
       * Solution: 200px threshold + Math.ceil for most lenient behavior
       * - User must scroll up >200px to disable auto-scroll
       * - Small scroll movements don't break tracking
       * - Perfect for streaming and long chats
       */
      const distanceFromBottom = Math.ceil(scrollHeight - scrollTop - clientHeight);
      const threshold = 200; // Ultra-forgiving threshold

      const isScrolledUp = distanceFromBottom > threshold;
      setShowScrollButton(isScrolledUp);

      // Update auto-scroll state based on scroll position
      const isNearBottom = distanceFromBottom <= threshold;
      setShouldAutoScroll(isNearBottom);
    }
  }, [ref]);

  const scrollToBottom = useCallback(
    (smooth: boolean = true) => {
      if (ref.current) {
        ref.current.scrollTo({
          top: ref.current.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        });
        // When user manually scrolls to bottom, enable auto-scroll
        setShouldAutoScroll(true);
      }
    },
    [ref],
  );

  /**
   * CRITICAL FIX: Don't block scrolling based on shouldAutoScroll
   *
   * Previous issue: if (!shouldAutoScroll) return; blocked ALL scrolling
   * This caused streaming to lose scroll tracking in long conversations
   *
   * New approach: Pass shouldAutoScroll to scroll manager, let IT decide
   * This allows context-aware scrolling (streaming vs not streaming)
   */
  const smartScrollToBottom = useCallback(
    (smooth: boolean = true) => {
      // Don't check shouldAutoScroll here - let scroll manager handle it
      // This is critical for streaming behavior
      scrollManager.smartScrollToBottom({ behavior: smooth ? 'smooth' : 'auto', delay: 0 });
    },
    [], // Removed shouldAutoScroll dependency - scroll manager handles it internally
  );

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
    setShowScrollButton,
    shouldAutoScroll,
    smartScrollToBottom,
    setShouldAutoScroll,
  };
};
