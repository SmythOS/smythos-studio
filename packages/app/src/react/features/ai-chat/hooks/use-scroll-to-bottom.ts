import { RefObject, useCallback, useEffect, useState } from 'react';

import { scrollManager } from '@react/features/ai-chat/utils/scroll-utils';

export const useScrollToBottom = (ref: RefObject<HTMLElement>) => {
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Initialize scroll manager with container
  useEffect(() => {
    if (ref.current) scrollManager.init(ref.current);
  }, [ref, ref.current]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    if (ref.current) {
      const { scrollTop, scrollHeight, clientHeight } = ref.current;

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

  const smartScrollToBottom = useCallback((smooth: boolean = true) => {
    scrollManager.smartScrollToBottom({ behavior: smooth ? 'smooth' : 'auto', delay: 0 });
  }, []);

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
