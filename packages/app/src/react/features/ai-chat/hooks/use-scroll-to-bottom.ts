import { RefObject, useCallback, useEffect, useState } from 'react';

export const useScrollToBottom = (ref: RefObject<HTMLElement>) => {
  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleScroll = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    if (ref.current) {
      const { scrollTop, scrollHeight, clientHeight } = ref.current;
      const isScrolledUp = scrollHeight - scrollTop > clientHeight + 100; // 100px threshold
      setShowScrollButton(isScrolledUp);
    }
  }, [ref]);

  const scrollToBottom = useCallback(
    (smooth: boolean = true) => {
      if (ref.current) {
        ref.current.scrollTo({
          top: ref.current.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    },
    [ref],
  );

  useEffect(() => {
    const container = ref.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [ref, handleScroll]);

  return { showScrollButton, handleScroll, scrollToBottom, setShowScrollButton };
};
