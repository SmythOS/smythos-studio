// ============================================================================
// CORE MESSAGE TYPES
// ============================================================================

/**
 * Message type discriminator
 * Complete state representation through type alone
 *
 * - 'user': Message from user
 * - 'system': Response from AI/system
 * - 'thinking': AI is processing/thinking
 * - 'loading': AI is generating response (replying/retrying)
 * - 'error': Error occurred during processing
 */
export type TMessageType = 'user' | 'system' | 'thinking' | 'loading' | 'error';

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
  message: string; // Message content
  type: TMessageType; // Message type - single source of truth for state
  conversationTurnId?: string; // Conversation Turn ID
  messageId?: string; // Message ID (future)
  files?: IMessageFile[]; // Attached files (user messages only)
  avatar?: string; // Avatar URL for system/AI messages
  thinkingMessage?: string; // Inline thinking/status message during generation
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
  metadata: {
    publicUrl?: string;
    fileType?: string;
    key?: string;
    isUploading?: boolean;
    previewUrl?: string;
  };
}

// ============================================================================
// STREAMING TYPES
// ============================================================================

/**
 * Stream chunk from backend
 * Only includes actually used properties
 */
export interface IStreamChunk {
  conversationTurnId?: string; // Conversation Turn ID
  messageId?: string; // Message ID (future)
  content?: string; // Content chunk for streaming responses
  status_message?: string; // Status/thinking message
  function?: string; // Function/tool name
  function_call?: { name?: string; arguments?: Record<string, unknown> };
  debug?: string; // Debug information
  hashId?: string; // Debug tracking hash
  debugOn?: boolean; // Debug session indicator
  error?: string; // Error message
  isError?: boolean; // Error indicator
}

export type TThinkingType = 'general' | 'function' | 'status'; // Thinking message type discriminator

export interface IStreamConfig {
  agentId: string; // Target agent ID
  chatId: string; // Conversation ID
  message: string; // User message content
  attachments?: IFileAttachment[]; // File attachments
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
  onContent: (content: string, conversationTurnId?: string) => void;
  onThinking?: (message: string, type: TThinkingType, conversationTurnId?: string) => void;
  onToolCall?: (
    toolName: string,
    args: Record<string, unknown>,
    conversationTurnId?: string,
  ) => void;
  onDebug?: (debug: IStreamChunk) => void; // Debug information received
  onError: (error: IChatError) => void; // Error occurred - error object now includes conversationTurnId
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
  conversationTurnId?: string; // Conversation turn ID for grouping
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
  isGenerating: boolean;
  isProcessing: boolean;
  error: IChatError | null;

  // Actions
  sendMessage: (message: string, files?: File[] | IMessageFile[]) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  stopGenerating: () => void;
  clearMessages: () => void;
  clearError: () => void;
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
