import { RefObject, useCallback, useEffect, useState } from 'react';

export const useScrollToBottom = (containerRef: RefObject<HTMLElement>) => {
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleScroll = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isScrolledUp = scrollHeight - scrollTop > clientHeight + 100; // 100px threshold
      setShowScrollButton(isScrolledUp);
    }
  }, [containerRef]);

  const scrollToBottom = useCallback(
    (smooth: boolean = true) => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    },
    [containerRef],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [containerRef, handleScroll]);

  return { showScrollButton, handleScroll, scrollToBottom, setShowScrollButton };
};
