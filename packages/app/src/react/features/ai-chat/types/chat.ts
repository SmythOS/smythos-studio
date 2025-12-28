/* eslint-disable no-unused-vars */
import type { Dispatch, RefObject, SetStateAction } from 'react';

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export type TMessageType = 'user' | 'system' | 'debug' | 'error' | 'loading' | 'meta';

export interface IFunctionCall {
  name?: string;
  topic?: string;
  arguments?: Record<string, unknown>;
}

export interface IMetaMessages {
  hashId?: string;
  debugOn?: boolean;
  debug?: string;
  title?: string;
  statusMessage?: string;
  function?: string;
  callParams?: unknown;
  parameters?: unknown;
  functionCall?: IFunctionCall;
}

export interface IAttachment {
  name: string;
  type: string;
  size: number;
  url?: string;
  blobUrl?: string | null;
  file?: File;
}

export interface IMessage {
  id: number;
  type: TMessageType;
  content: string;
  metaMessages?: IMetaMessages;
  updatedAt?: number;
  attachments?: IAttachment[];
}

// ============================================================================
// FILE & ATTACHMENT TYPES
// ============================================================================

export interface IMessageFile {
  id: string;
  file: File;
  url?: string;
  name?: string;
  type?: string;
  size?: number;
  metadata: {
    key?: string;
    fileType?: string;
    publicUrl?: string;
    previewUrl?: string;
    isUploading?: boolean;
  };
}

export interface IFileAttachment {
  id: string;
  file: File;
  blobUrl: string | null;
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface IUploadStatus {
  status: 'uploading' | 'completed' | 'error';
  progress: number;
}

// ============================================================================
// STREAMING & API TYPES
// ============================================================================

export interface IStreamChunk {
  conversationTurnId?: string;
  content?: string;
  debugOn?: boolean;
  title?: string;
  debug?: string;
  status_message?: string;
  callParams?: string;
  parameters?: Record<string, unknown>;
  function?: string;
  function_call?: IFunctionCall;
  hashId?: string;
  error?: string;
  isError?: boolean;
}

export interface IStreamConfig {
  agentId: string;
  chatId: string;
  domain?: string;
  port?: number;
  message: string;
  modelId?: string;
  attachments?: IMessageFile[];
  enableMetaMessages?: boolean;
  signal: AbortSignal;
  headers?: Record<string, string>;
}

export interface IStreamCallbacks {
  onContent: (content: string, turnId?: string) => void;
  onMetaMessages?: (metaMessages: IMetaMessages, turnId?: string) => void;
  onError: (error: IChatError) => void;
  onStart?: () => void;
  onComplete: () => void;
}

export type TErrorType = 'stream' | 'network' | 'abort' | 'system';

export interface IChatError {
  message: string;
  type: TErrorType;
  turnId?: string;
  originalError?: Error | unknown;
  isAborted?: boolean;
}

export interface IAPIConfig {
  domain?: string;
  port?: number;
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retry?: { attempts: number; delay: number };
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

/**
 * Interface for focusable input elements
 * Used for auto-focus functionality after stream completion
 */
export interface IFocusableInput {
  focus: () => void;
}

export interface IConfigOptions {
  agentId: string;
  chatId: string;
  modelId?: string;
  enableMetaMessages?: boolean;

  /** Optional ref to input element for auto-focus on stream complete */
  inputRef?: RefObject<IFocusableInput | null>;
}

export interface IChatState {
  messages: IMessage[];
  setMessages: Dispatch<SetStateAction<IMessage[]>>;
  isStreaming: boolean;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  sendMessage: (
    message: string,
    currentAttachments?: IAttachment[],
    shouldSetUserMessage?: boolean,
  ) => Promise<void>;
  stopStreaming: () => void;
  retryLastMessage: () => void;
}

export interface IFileUpload {
  attachments: IFileAttachment[];
  status: Record<string, IUploadStatus>;
  uploading: boolean;
  errorMessage: string;
  addFiles: (files: File[]) => Promise<void>;
  remove: (index: number) => void;
  clear: (preserveBlobUrls?: boolean) => void;
  clearError: () => void;
}
