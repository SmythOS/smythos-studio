import type { TUploadFile } from '@react/features/ai-chat/types';

/**
 * Creates a TUploadFile from plain text content
 * Useful for converting pasted text into a file attachment
 * @param content - The text content to convert to a file
 * @returns TUploadFile object with the text content as a .txt file
 */
export const createFileFromText = (content: string): TUploadFile => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `text-${timestamp}.txt`;
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], name, { type: 'text/plain' });
  const id = `text-${timestamp}`;

  return { file, metadata: { fileType: 'text/plain', isUploading: false }, id };
};
