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
  hideMessageBubble?: boolean;
  thinkingMessage?: string;
  isLast?: boolean;
  isRetrying?: boolean;
  onRetryClick?: () => void;
}
