// ============================================================================
// CORE MESSAGE TYPES
// ============================================================================

export type IChildren = { children: React.ReactNode };

/**
 * Message type discriminator
 * Complete state representation through type alone
 *
 * - 'user': Message from user
 * - 'system': Response from AI/system
 * - 'debug': AI is processing/thinking
 * - 'loading': AI is generating response (replying/retrying)
 * - 'error': Error occurred during processing
 */
export type TMessageType = 'user' | 'system' | 'debug' | 'loading' | 'error' | 'meta';

/**
 * Core chat message interface
 *
 * Design principles:
 * - Type-based discrimination - `type` is single source of truth
 * - No redundant boolean flags (isReplying, isRetrying, isError)
 * - Minimal required fields
 * - Optional fields for specific use cases
 */
export interface IChatMessage {
  id?: string | number; // Unique identifier
  turnId?: string; // Conversation Turn ID
  message: string; // Message content
  type: TMessageType; // Message type - single source of truth for state
  files?: IMessageFile[]; // Attached files (user messages only)
  avatar?: string; // Avatar URL for system/AI messages
  metaMessages?: IMetaMessages; // Full meta messages object for thinking component
  onRetryClick?: () => void; // Retry callback for error messages
  timestamp?: number; // Message timestamp (optional, for future use)
}

/**
 * File attachment structure
 * Simplified from previous complex nested structure
 */

export interface IMessageFile {
  id: string; // Required ID for React keys and tracking
  file: File; // The actual File object
  url?: string; // Public URL (stored after upload)
  name?: string; // File name (stored after upload)
  type?: string; // File type/MIME type (stored after upload)
  size?: number; // File size in bytes (stored after upload)
  metadata: {
    key?: string;
    fileType?: string;
    publicUrl?: string;
    previewUrl?: string;
    isUploading?: boolean;
  };
}

// ============================================================================
// AGENT SETTINGS TYPES
// ============================================================================

export type TUAgentSettings = { key: string; value: string };

// ============================================================================
// STREAMING TYPES
// ============================================================================

export interface IFunctionCall {
  name?: string;
  arguments?: Record<string, unknown>;
  topic?: string;
}

export interface IMetaMessages {
  debug: string;
  title: string;
  statusMessage: string;
  function: string;
  callParams: string;
  parameters: Record<string, unknown>;
  functionCall: IFunctionCall;
}

/**
 * Stream chunk from backend
 * Only includes actually used properties
 */
export interface IStreamChunk {
  conversationTurnId?: string; // Conversation Turn ID
  content?: string; // Content chunk for streaming responses
  debugOn?: boolean; // Debug session indicator
  title?: string; // Title of the message
  debug?: string; // Debug information
  status_message?: string; // Status/thinking message
  callParams?: string; // Call parameters
  parameters?: Record<string, unknown>; // Parameters
  function?: string; // Function/tool name
  function_call?: IFunctionCall; // Function call information
  hashId?: string; // Debug tracking hash
  error?: string; // Error message
  isError?: boolean; // Error indicator
}

export type TThinkingType = 'tools' | 'general'; // Thinking message type discriminator

export interface IStreamConfig {
  agentId: string; // Target agent ID
  chatId: string; // Conversation ID
  message: string; // User message content
  modelId?: string; // Model ID to override backend model selection
  attachments?: IMessageFile[]; // File attachments
  signal: AbortSignal; // Abort signal for cancellation
  headers?: Record<string, string>; // Custom headers
}

export interface IFileAttachment {
  url: string; // Public URL
  name?: string; // Filename
  type?: string; // MIME type
  size?: number; // File size
}

/**
 * Stream event callbacks
 */
/* eslint-disable no-unused-vars */
export interface IStreamCallbacks {
  onContent: (content: string, turnId?: string) => void;
  onMetaMessages?: (metaMessages: IMetaMessages, turnId?: string) => void;
  onError: (error: IChatError) => void; // Error occurred - error object now includes turnId
  onStart?: () => void; // Stream started
  onComplete: () => void; // Stream completed
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type TErrorType = 'stream' | 'network' | 'abort' | 'system';

export interface IChatError {
  message: string; // Error message
  type: TErrorType; // Error type
  turnId?: string; // Conversation turn ID for grouping
  originalError?: Error | unknown; // Original error object
  isAborted?: boolean; // User-initiated abort flag
}

// ============================================================================
// HOOK INTERFACES
// ============================================================================

/**
 * Chat hook return type
 */
export interface IUseChatReturn {
  // State
  messages: IChatMessage[];
  isStreaming: boolean;

  // Actions
  sendMessage: (message: string, files?: File[] | IMessageFile[]) => Promise<void>;
  retryMessage: () => Promise<void>;
  stopStreaming: () => void;
  clearMessages: () => void;
}

// ============================================================================
// API CLIENT TYPES
// ============================================================================

/**
 * API client configuration
 */
export interface IAPIConfig {
  baseUrl?: string; // Base API URL
  defaultHeaders?: Record<string, string>; // Default headers
  timeout?: number; // Request timeout
  retry?: { attempts: number; delay: number }; // Retry configuration
}

