export interface FileMetadata {
  key?: string;
  publicUrl?: string;
  fileType?: string;
  previewUrl?: string;
  isUploading?: boolean;
}

export interface FileWithMetadata {
  file: File;
  metadata: FileMetadata;
  id: string;
}

export interface IChatMessage {
  me: boolean;
  message: string;
  type?: 'user' | 'system' | 'thinking';
  avatar?: string;
  isReplying?: boolean;
  isError?: boolean;
  isFirstMessage?: boolean;
  files?: FileWithMetadata[];
  hideMessage?: boolean;
  thinkingMessage?: string; // Inline thinking message to show with system messages
  isLast?: boolean; // Whether this is the last message in the chat
  isRetrying?: boolean; // Whether this message is being retried
  onRetryClick?: () => void; // Function to call when retry is clicked
}
