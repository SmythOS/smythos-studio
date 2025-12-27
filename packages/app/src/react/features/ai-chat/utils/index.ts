import { IMessageFile } from '@react/features/ai-chat/types/chat.types';

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
