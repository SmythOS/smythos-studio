import { IMessageFile } from '@react/features/ai-chat/types/chat.types';

/**
 * Constants for file upload limitations
 */
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
  MAX_ATTACHED_FILES: 5,
  ACCEPTED_TYPES: ['*/*'], // Accept all file types like chatbot
} as const;

/**
 * Gets local preview URL for a file if possible
 * @param {File} file - File to get preview for
 * @returns {string | null} Preview URL or null if preview not possible
 */
export const getLocalPreviewUrl = (file: File): string | null => {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file);
  }
  return null;
};

/**
 * Validates a single file against size constraints only
 * @param file The file to validate
 * @returns An error message if validation fails, null if validation passes
 */
export const validateSingleFile = (file: File): string | null => {
  if (file.size > FILE_LIMITS.MAX_FILE_SIZE) {
    return 'File size exceeds 5MB limit';
  }

  // Accept all file types - no file type validation needed
  // Since we're accepting */* all file types are allowed

  return null;
};

/**
 * Deletes a file from the server
 * @param key The file key to delete
 */
export const deleteFile = async (key: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/page/chat/deleteFile?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Creates file metadata object from a file
 * @param file The file to create metadata for
 * @returns FileWithMetadata object
 */
export const createFileMetadata = (file: File): IMessageFile => ({
  file,
  id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  metadata: { fileType: file.type, previewUrl: getLocalPreviewUrl(file), isUploading: true },
});
