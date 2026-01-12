import { ALLOWED_FILE_SIZE, MAX_UPLOADS } from '@react/features/ai-chat/constants';
import type { TUploadFile } from '@react/features/ai-chat/types';

export const FILE_LIMITS = {
  MAX_ATTACHED_FILES: MAX_UPLOADS,
  MAX_FILE_SIZE: ALLOWED_FILE_SIZE,
} as const;

export const textToFile = (content: string): TUploadFile => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `text-${timestamp}.txt`;
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], name, { type: 'text/plain' });
  const id = `text-${timestamp}`;

  return { file, metadata: { fileType: 'text/plain', isUploading: false }, id };
};

export const validateFile = (file: File): string | undefined => {
  if (file.size > ALLOWED_FILE_SIZE) {
    return `File "${file.name}" exceeds 5MB size limit`;
  }
  return undefined;
};

export const createFileId = (file: File): string => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${file.name}-${timestamp}-${randomSuffix}`;
};

type TUploadConfig = { files: File[]; agentId?: string; chatId?: string };
type TUploadResult = { files?: Array<{ url: string; name?: string; mimetype?: string }> };

export const uploadFiles = async (config: TUploadConfig): Promise<TUploadResult> => {
  const { files, agentId, chatId } = config;

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file);
  });

  const headers: Record<string, string> = {};
  if (agentId) headers['X-AGENT-ID'] = agentId;
  if (chatId) headers['x-conversation-id'] = chatId;

  const response = await fetch('/api/page/chat/upload', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json() as Promise<TUploadResult>;
};
