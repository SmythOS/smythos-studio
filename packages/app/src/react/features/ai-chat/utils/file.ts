import { ALLOWED_FILE_SIZE, MAX_UPLOADS } from '@react/features/ai-chat/constants';
import type { TUploadFile } from '@react/features/ai-chat/types';

/**
 * File upload limits configuration
 */
export const FILE_LIMITS = {
  MAX_ATTACHED_FILES: MAX_UPLOADS,
  MAX_FILE_SIZE: ALLOWED_FILE_SIZE,
} as const;

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

/**
 * Validates a single file for upload
 * @param file - File to validate
 * @returns Error message string if invalid, undefined if valid
 */
export const validateSingleFile = (file: File): string | undefined => {
  if (file.size > ALLOWED_FILE_SIZE) {
    return `File "${file.name}" exceeds 5MB size limit`;
  }
  return undefined;
};

/**
 * Generates a unique ID for a file based on name and timestamp
 * @param file - File to generate ID for
 * @returns Unique file ID string
 */
export const generateUniqueFileId = (file: File): string => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${file.name}-${timestamp}-${randomSuffix}`;
};

type TUploadFilesParams = {
  files: File[];
  agentId?: string;
  chatId?: string;
};

type TUploadFilesResponse = {
  files?: Array<{
    url: string;
    name?: string;
    mimetype?: string;
  }>;
};

/**
 * Uploads files to the chat API
 * @param params - Upload parameters including files, agentId, and chatId
 * @returns Promise with uploaded file information
 */
export const uploadFiles = async (params: TUploadFilesParams): Promise<TUploadFilesResponse> => {
  const { files, agentId, chatId } = params;

  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file);
  });

  const headers: Record<string, string> = {};
  if (agentId) {
    headers['X-AGENT-ID'] = agentId;
  }
  if (chatId) {
    headers['x-conversation-id'] = chatId;
  }

  const response = await fetch('/api/page/chat/upload', {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json() as Promise<TUploadFilesResponse>;
};
