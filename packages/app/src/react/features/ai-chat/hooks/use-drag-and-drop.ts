import { useEffect, useRef, useCallback, RefObject } from 'react';

interface UseDragAndDropProps {
  onDrop: (files: File[]) => Promise<void>;
}

/**
 * A hook that provides drag and drop functionality for files within a specific container
 * @param onDrop - Callback function that handles the dropped files
 * @returns A ref object to be attached to the container element where drag and drop should be enabled
 */
export const useDragAndDrop = ({ onDrop }: UseDragAndDropProps): RefObject<HTMLElement> => {
  const containerRef = useRef<HTMLElement>(null);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      containerRef.current?.classList.add('file-drag-active');
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      containerRef.current?.classList.remove('file-drag-active');
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current = 0;
      containerRef.current?.classList.remove('file-drag-active');

      const droppedFiles = Array.from(e.dataTransfer?.files || []);
      if (droppedFiles.length > 0) {
        await onDrop(droppedFiles);
      }
    },
    [onDrop],
  );

  useEffect(() => {
    const element = containerRef.current;
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
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  return containerRef;
};
