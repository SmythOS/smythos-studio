import { FileWithMetadata } from '@react/shared/types/chat.types';

/**
 * Constants for file upload limitations
 */
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
  MAX_ATTACHED_FILES: 5,
  ACCEPTED_TYPES: ['*/*'], // Accept all file types like chatbot
} as const;

/**
 * Supported file types for preview
 */
export const FILE_TYPES = {
  PDF: 'application/pdf',
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const,
  CSV: ['text/csv', 'application/csv'] as const,
  EXCEL: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ] as const,
} as const;

type ImageMimeType = (typeof FILE_TYPES.IMAGE)[number];

/**
 * Checks if the file is an image
 * @param {File} file - File to check
 * @returns {boolean} True if file is an image
 */
export const isImageFile = (file: File): boolean => {
  return FILE_TYPES.IMAGE.includes(file.type as ImageMimeType);
};

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
 * Validates files against size, type and count limits
 * @param newFiles Array of files to validate
 * @param existingFileCount Number of files already attached
 * @returns Error message string if validation fails, null if validation passes
 */
export const validateFiles = (newFiles: File[], existingFileCount: number): string | null => {
  // Check total file count
  const totalFileCount = existingFileCount + newFiles.length;
  if (totalFileCount > FILE_LIMITS.MAX_ATTACHED_FILES) {
    return `Maximum ${FILE_LIMITS.MAX_ATTACHED_FILES} files allowed`;
  }

  // Check each file
  for (const file of newFiles) {
    // Check file size
    if (file.size > FILE_LIMITS.MAX_FILE_SIZE) {
      return `File ${file.name} exceeds maximum size of 5MB`;
    }

    // Accept all file types - no file type validation needed
    // Since we're accepting */* all file types are allowed
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
 * Uploads a file to the server
 * @param file The file to upload
 * @returns The uploaded file data or error
 */
export const uploadFile = async (
  file: File,
  agentId: string,
  chatId?: string,
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/page/chat/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'X-AGENT-ID': agentId,
        ...(chatId ? { 'x-conversation-id': chatId } : {}),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
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
export const createFileMetadata = (file: File): FileWithMetadata => ({
  file,
  id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  metadata: {
    fileType: file.type,
    previewUrl: getLocalPreviewUrl(file),
    isUploading: true,
  },
});
