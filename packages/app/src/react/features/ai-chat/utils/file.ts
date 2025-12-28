/**
 * Constants for file upload limitations
 */
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
  MAX_ATTACHED_FILES: 5,
  ACCEPTED_TYPES: ['*/*'], // Accept all file types like chatbot
} as const;

/**
 * Validates a single file against size constraints only
 * @param file - The file to validate
 * @returns An error message if validation fails, null if validation passes
 */
export const validateSingleFile = (file: File): string | null => {
  if (file.size > FILE_LIMITS.MAX_FILE_SIZE) {
    return 'File size exceeds 5MB limit';
  }

  return null;
};

/**
 * Generates a unique ID for a file
 * @param file - The file to generate ID for
 * @returns Unique file identifier string
 */
export const generateUniqueFileId = (file: File): string => {
  return `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

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
 * @param props - Upload configuration
 * @returns Promise with upload response containing file URLs
 */
export const uploadFiles = async (props: IUploadFilesProps): Promise<IUploadResponse> => {
  const { files, agentId, chatId } = props;

  try {
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

    const data = await response.json();
    const runtimeFiles = data?.files || (data?.file ? [data.file] : []);

    return {
      files: runtimeFiles.map(
        (f: {
          url?: string;
          publicUrl?: string;
          mimetype?: string;
          type?: string;
          name?: string;
          size?: number;
        }) => ({
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
