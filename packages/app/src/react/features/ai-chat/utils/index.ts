import { IMessageFile } from '@react/features/ai-chat/types/chat.types';

/** Default max height for textarea auto-resize (in pixels) */
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

export const createFileFromText = (content: string): IMessageFile => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `text-${timestamp}.txt`;
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], name, { type: 'text/plain' });
  const id = `text-${timestamp}`;

  return { file, metadata: { fileType: 'text/plain', isUploading: false }, id };
};

/**
 * LLM Model configuration interface
 */
export interface ILLMModel {
  label: string;
  value: string;
  tags: string[];
  default?: boolean;
  provider: string;
}

/**
 * Badge configuration for model tags (enterprise, smythos, personal, limited)
 */
const BADGE_TAGS: Record<string, boolean> = {
  enterprise: true,
  smythos: true,
  personal: true,
  limited: true,
};

/**
 * Extracts display badge from model tags
 * @param tags - Array of model tags
 * @returns Badge string for display
 */
export function getBadgeFromTags(tags: string[]): string {
  return tags.filter((tag) => BADGE_TAGS[tag?.toLowerCase()]).join(' ');
}
