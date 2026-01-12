import { RefObject, useCallback, useEffect, useRef } from 'react';

type TDragAndDropConfig = {
  ref: RefObject<HTMLElement | null>;
  onDrop: (files: File[]) => Promise<void>; // eslint-disable-line no-unused-vars
};

export const useDragAndDrop = ({ ref, onDrop }: TDragAndDropConfig): void => {
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current++;
      if (dragCounterRef.current === 1) {
        ref.current?.classList.add('file-drag-active');
      }
    },
    [ref],
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        ref.current?.classList.remove('file-drag-active');
      }
    },
    [ref],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current = 0;
      ref.current?.classList.remove('file-drag-active');

      const droppedFiles = Array.from(e.dataTransfer?.files || []);
      if (droppedFiles.length > 0) {
        await onDrop(droppedFiles);
      }
    },
    [ref, onDrop],
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('dragenter', handleDragEnter);
    element.addEventListener('dragleave', handleDragLeave);
    element.addEventListener('dragover', handleDragOver);
    element.addEventListener('drop', handleDrop);

    return () => {
      element.removeEventListener('dragenter', handleDragEnter);
      element.removeEventListener('dragleave', handleDragLeave);
      element.removeEventListener('dragover', handleDragOver);
      element.removeEventListener('drop', handleDrop);
      element.classList.remove('file-drag-active');
    };
  }, [ref, handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);
};
