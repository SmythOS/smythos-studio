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
      const isScrolledUp = scrollHeight - scrollTop > clientHeight + 100; // 100px threshold
      setShowScrollButton(isScrolledUp);

      // Update auto-scroll state based on scroll position
      const isNearBottom = scrollHeight - scrollTop <= clientHeight + 100;
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

  // Professional smart scroll function
  const smartScrollToBottom = useCallback(
    (smooth: boolean = true) => {
      if (!shouldAutoScroll) return;

      // Use professional scroll manager
      scrollManager.smartScrollToBottom({ behavior: smooth ? 'smooth' : 'auto', delay: 0 });
    },
    [shouldAutoScroll],
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
