/**
 * Default max height for textarea auto-resize (in pixels)
 */
const DEFAULT_TEXTAREA_MAX_HEIGHT = 160;

/**
 * Adjusts textarea height based on its content
 * @param textarea - The textarea element to adjust
 * @param maxHeight - Maximum height in pixels (defaults to 160)
 */
export const adjustTextareaHeight = (
  textarea: HTMLTextAreaElement | null,
  maxHeight: number = DEFAULT_TEXTAREA_MAX_HEIGHT,
): void => {
  if (!textarea) return;

  textarea.style.height = 'auto';
  const newHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = `${newHeight}px`;
  textarea.style.overflowY = newHeight === maxHeight ? 'auto' : 'hidden';
};

