const DEFAULT_TEXTAREA_MAX_HEIGHT = 160;

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
