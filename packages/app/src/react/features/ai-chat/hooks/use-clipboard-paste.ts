/* eslint-disable no-unused-vars */
import { RefObject, useCallback, useEffect } from 'react';

interface UseClipboardPasteOptions {
  onFilePaste: (files: File[]) => void;
  enabled?: boolean;
  targetRef?: RefObject<HTMLTextAreaElement | HTMLElement>;
  largeTextThreshold?: number;
  onLargeTextPaste?: (text: string) => void;
}

/**
 * Custom hook to handle clipboard paste events for files, images, and large text
 *
 * @param options - Configuration options
 * @param options.onFilePaste - Callback function to handle pasted files/images
 * @param options.enabled - Whether the paste listener is enabled (default: true)
 * @param options.targetRef - Ref to specific textarea/element to listen on
 * @param options.largeTextThreshold - Character threshold for large text (optional)
 * @param options.onLargeTextPaste - Callback for large text paste (optional)
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const inputRef = useRef<HTMLTextAreaElement>(null);
 *
 *   const handleFileDrop = (files: File[]) => {
 *     console.log('Files added:', files);
 *   };
 *
 *   const createFileFromText = (text: string) => {
 *     const blob = new Blob([text], { type: 'text/plain' });
 *     return new File([blob], 'pasted-text.txt', { type: 'text/plain' });
 *   };
 *
 *   useClipboardPaste({
 *     onFilePaste: handleFileDrop,
 *     targetRef: inputRef,
 *     largeTextThreshold: 5000,
 *     onLargeTextPaste: (text) => {
 *       const file = createFileFromText(text);
 *       handleFileDrop([file]);
 *     }
 *   });
 *
 *   return <textarea ref={inputRef} />;
 * };
 * ```
 */
export const useClipboardPaste = ({
  onFilePaste,
  enabled = true,
  targetRef,
  largeTextThreshold,
  onLargeTextPaste,
}: UseClipboardPasteOptions) => {
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (!event.clipboardData) return;

      const items = event.clipboardData.items;
      const files: File[] = [];

      // First, check for files/images in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      // If files/images found, handle them
      if (files.length > 0) {
        event.preventDefault();
        onFilePaste(files);
        return;
      }

      // If no files, check for large text (if configured)
      if (largeTextThreshold && onLargeTextPaste) {
        const pastedText = event.clipboardData.getData('text/plain') || '';

        if (pastedText.length >= largeTextThreshold) {
          event.preventDefault();
          onLargeTextPaste(pastedText);

          // Maintain cursor position after handling
          requestAnimationFrame(() => {
            if (targetRef?.current) {
              const element = targetRef.current as HTMLTextAreaElement;
              element.focus();
              const currentPos = element.selectionStart || 0;
              element.selectionStart = currentPos;
              element.selectionEnd = currentPos;
            }
          });
        }
      }

      // If neither files nor large text, let browser handle normally
    },
    [onFilePaste, largeTextThreshold, onLargeTextPaste, targetRef],
  );

  useEffect(() => {
    if (!enabled) return;

    // Use specific element from ref or document
    const element = targetRef?.current || document;

    // Add event listener
    element.addEventListener('paste', handlePaste as EventListener);

    // Cleanup
    return () => {
      element.removeEventListener('paste', handlePaste as EventListener);
    };
  }, [handlePaste, enabled, targetRef]);
};
