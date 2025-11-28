import { IMessageFile } from '@react/features/ai-chat/types/chat.types';

export const createFileFromText = (content: string): IMessageFile => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `text-${timestamp}.txt`;
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], name, { type: 'text/plain' });
  const id = `text-${timestamp}`;

  return { file, metadata: { fileType: 'text/plain', isUploading: false }, id };
};
