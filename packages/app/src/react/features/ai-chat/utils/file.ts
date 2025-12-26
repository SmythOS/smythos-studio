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
  return file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
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

// Helper function to generate a unique ID for each file
export const generateUniqueFileId = (file: File): string => {
  return `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
/**
 * Creates file metadata object from a file
 * @param file The file to create metadata for
 * @returns FileWithMetadata object
 */
export const createFileMetadata = (file: File): IMessageFile => ({
  file,
  id: generateUniqueFileId(file),
  metadata: { fileType: file.type, previewUrl: getLocalPreviewUrl(file), isUploading: true },
});

/**
 * Interface for upload files props
 */
interface IUploadFilesProps {
  files: File[];
  agentId?: string;
  chatId?: string;
}

/**
 * Interface for upload response
 */
interface IUploadResponse {
  files?: Array<{
    url: string;
    name?: string;
    type?: string;
    size?: number;
    mimetype?: string;
  }>;
}

/**
 * Uploads files to the server
 *
 * @param props - Upload configuration
 * @returns Promise with upload response containing file URLs
 *
 * @example
 * ```typescript
 * const response = await uploadFiles({
 *   files: [file1, file2],
 *   agentId: 'agent-123',
 *   chatId: 'chat-456',
 * });
 * console.log(response.files[0].url);
 * ```
 */
export const uploadFiles = async (props: IUploadFilesProps): Promise<IUploadResponse> => {
  const { files, agentId, chatId } = props;

  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('file', file);
    });

    const headers: Record<string, string> = {};

    // Add agent and chat IDs if provided
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

    const data = await response.json();

    // Normalize response structure
    const runtimeFiles = data?.files || (data?.file ? [data.file] : []);

    return {
      files: runtimeFiles.map(
        (f: { url?: string; publicUrl?: string; mimetype?: string; type?: string; name?: string; size?: number }) => ({
          url: f.url || f.publicUrl || '',
          name: f.name,
          type: f.mimetype || f.type,
          size: f.size,
        }),
      ),
    };
  } catch (error) {
    console.error('Error uploading files:', error); // eslint-disable-line no-console
    throw error;
  }
};