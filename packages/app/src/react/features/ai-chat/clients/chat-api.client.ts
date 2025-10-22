/**
 * Modern Chat API Client with Streaming Support
 * Provides a clean, professional interface for chat operations
 */

import {
  IChatAPIConfig,
  IChatError,
  IChatFileAttachment,
  IChatStreamCallbacks,
  IChatStreamChunk,
  IChatStreamConfig,
  TChatErrorType,
} from '../types/chat.types';
import {
  createThinkingManager,
  extractFunctionName,
  formatFunctionName,
  formatStatusMessage,
  processStreamChunk,
  splitJSONStream,
} from '../utils/stream.utils';

/**
 * Default configuration for the Chat API Client
 */
const DEFAULT_CONFIG: IChatAPIConfig = {
  baseUrl: '/api/page/chat',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minutes
  retry: {
    attempts: 0, // No retry by default for streaming
    delay: 1000,
  },
};

/**
 * Chat API Client class
 * Handles all communication with the chat service including streaming responses
 */
export class ChatAPIClient {
  private config: IChatAPIConfig;
  private thinkingManager = createThinkingManager();

  /**
   * Creates a new ChatAPIClient instance
   *
   * @param config - Optional configuration overrides
   *
   * @example
   * ```typescript
   * const client = new ChatAPIClient({
   *   baseUrl: '/custom/api/endpoint',
   *   timeout: 60000,
   * });
   * ```
   */
  constructor(config: Partial<IChatAPIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Streams a chat response with real-time updates
   * Handles content streaming, thinking messages, function calls, and errors
   *
   * @param streamConfig - Stream configuration including message and agent info
   * @param callbacks - Event callbacks for different stream events
   * @returns Promise that resolves when stream completes
   *
   * @example
   * ```typescript
   * await client.streamChat(
   *   {
   *     agentId: 'agent-123',
   *     chatId: 'chat-456',
   *     message: 'Hello, AI!',
   *     signal: abortController.signal,
   *   },
   *   {
   *     onContent: (content) => console.log('Content:', content),
   *     onError: (error) => console.error('Error:', error),
   *     onComplete: () => console.log('Stream complete'),
   *   }
   * );
   * ```
   */
  async streamChat(
    streamConfig: IChatStreamConfig,
    callbacks: IChatStreamCallbacks,
  ): Promise<void> {
    const { agentId, chatId, message, attachments, signal, headers = {} } = streamConfig;
    const { onContent, onThinking, onToolCall, onDebug, onError, onStart, onComplete } = callbacks;

    // Validate required parameters
    if (!agentId || !chatId || !message) {
      const error: IChatError = {
        message: 'Missing required parameters: agentId, chatId, or message',
        type: 'system_error',
      };
      onError(error);
      return Promise.reject(error);
    }

    // State management for stream processing
    let accumulatedData = '';
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      // Notify stream start
      if (onStart) {
        onStart();
      }

      // Prepare request
      const requestHeaders = {
        ...this.config.defaultHeaders,
        'X-AGENT-ID': agentId,
        'x-conversation-id': chatId,
        'x-ai-agent': 'true',
        ...headers,
      };

      const requestBody = {
        message,
        attachments: attachments || [],
      };

      // Make streaming request
      const response = await fetch(`${this.config.baseUrl}/stream`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
        signal,
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        const error: IChatError = {
          message: errorData.message || `HTTP ${response.status}: Failed to get response`,
          type: 'network_error',
        };
        onError(error);
        return Promise.reject(error);
      }

      // Get stream reader
      reader = response.body?.getReader();
      if (!reader) {
        const error: IChatError = {
          message: 'Failed to get response reader - response body is null',
          type: 'stream_error',
        };
        onError(error);
        return Promise.reject(error);
      }

      // Process stream
      await this.processStream(reader, signal, accumulatedData, {
        onContent,
        onThinking,
        onToolCall,
        onDebug,
        onError,
      });

      // Stream completed successfully
      this.thinkingManager.stop();
      onComplete();
    } catch (error) {
      // Handle different error types
      const chatError = this.handleStreamError(error, signal);

      // Stop thinking messages on error
      this.thinkingManager.stop();

      // Notify error callback
      onError(chatError);

      // Clean up reader
      if (reader) {
        try {
          await reader.cancel();
        } catch {
          // Ignore cancel errors
        }
      }

      return Promise.reject(chatError);
    }
  }

  /**
   * Processes the stream reader and handles chunks
   *
   * @param reader - Stream reader
   * @param signal - Abort signal
   * @param accumulatedData - Accumulated data buffer
   * @param callbacks - Event callbacks
   */
  private async processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    signal: AbortSignal,
    accumulatedData: string,
    callbacks: Pick<
      IChatStreamCallbacks,
      'onContent' | 'onThinking' | 'onToolCall' | 'onDebug' | 'onError'
    >,
  ): Promise<void> {
    const { onContent, onThinking, onToolCall, onDebug, onError } = callbacks;
    const decoder = new TextDecoder();

    while (true) {
      // Check for abort
      if (signal.aborted) {
        await reader.cancel();
        throw new DOMException('Stream aborted', 'AbortError');
      }

      // Read next chunk
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode chunk
      const decodedValue = decoder.decode(value, { stream: true });
      accumulatedData += decodedValue;

      // Parse JSON chunks
      const chunks = splitJSONStream(accumulatedData);

      if (chunks.length === 0) {
        continue; // Wait for more complete data
      }

      // Process each chunk
      for (const chunk of chunks) {
        await this.processChunk(chunk, { onContent, onThinking, onToolCall, onDebug, onError });
      }

      // Clear accumulated data after successful processing
      accumulatedData = '';
    }
  }

  /**
   * Processes a single stream chunk
   *
   * @param chunk - Stream chunk to process
   * @param callbacks - Event callbacks
   */
  private async processChunk(
    chunk: IChatStreamChunk,
    callbacks: Pick<
      IChatStreamCallbacks,
      'onContent' | 'onThinking' | 'onToolCall' | 'onDebug' | 'onError'
    >,
  ): Promise<void> {
    const { onContent, onThinking, onToolCall, onDebug, onError } = callbacks;
    const processed = processStreamChunk(chunk);

    // Handle errors
    if (processed.hasError) {
      const error: IChatError = {
        message: processed.error || 'Unknown error occurred',
        type: (processed.errorType as TChatErrorType) || 'stream_error',
      };
      onError(error);
      return;
    }

    // Handle status messages (highest priority)
    if (processed.hasStatusMessage && onThinking) {
      const formattedStatus = formatStatusMessage(processed.statusMessage || '');
      this.thinkingManager.start('status', onThinking, undefined, formattedStatus);
      return;
    }

    // Handle function calls
    if (processed.hasFunctionCall) {
      const functionName = processed.functionName || 'Unknown';
      const formattedName = formatFunctionName(functionName);

      // Notify tool call callback
      if (onToolCall && chunk.function_call?.arguments) {
        onToolCall(functionName, chunk.function_call.arguments);
      }

      // Start function thinking
      if (onThinking) {
        this.thinkingManager.start('function', onThinking, formattedName);
      }
    }

    // Handle debug messages
    if (processed.hasDebug && onDebug) {
      onDebug(chunk);

      // Try to extract function name from debug
      const functionName = extractFunctionName(chunk.debug || '');
      if (functionName && onThinking) {
        const formattedName = formatFunctionName(functionName);
        this.thinkingManager.start('function', onThinking, formattedName);
      }
    }

    // Handle content (final response)
    if (processed.hasContent) {
      // Stop thinking when content arrives
      this.thinkingManager.stop();

      // Deliver content
      onContent(processed.content);
    }
  }

  /**
   * Handles and categorizes stream errors
   *
   * @param error - Error object
   * @param signal - Abort signal to check for user cancellation
   * @returns Structured chat error
   */
  private handleStreamError(error: unknown, signal: AbortSignal): IChatError {
    // Check if this is an abort error
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        message: signal.aborted ? 'Request was cancelled' : 'Stream was aborted',
        type: 'abort_error',
        isAborted: true,
        originalError: error,
      };
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        message: `Network request failed: ${error.message}`,
        type: 'network_error',
        originalError: error,
      };
    }

    // Handle generic errors
    if (error instanceof Error) {
      return {
        message: error.message || 'An unexpected error occurred',
        type: 'system_error',
        originalError: error,
      };
    }

    // Unknown error type
    return {
      message: 'An unexpected error occurred. Please try again.',
      type: 'system_error',
      originalError: error,
    };
  }

  /**
   * Parses error response from HTTP response
   *
   * @param response - HTTP response
   * @returns Parsed error data
   */
  private async parseErrorResponse(response: Response): Promise<{ message: string }> {
    try {
      const data = await response.json();
      return {
        message: data?.error || data?.message || 'Failed to get a valid response',
      };
    } catch {
      // If JSON parsing fails, use generic error
      return {
        message: `HTTP ${response.status}: Failed to get a valid response`,
      };
    }
  }

  /**
   * Uploads a file for chat attachment
   *
   * @param file - File to upload
   * @param agentId - Agent ID
   * @returns File attachment metadata
   *
   * @example
   * ```typescript
   * const attachment = await client.uploadFile(file, 'agent-123');
   * // Use attachment.url in chat message
   * ```
   */
  async uploadFile(file: File, agentId: string): Promise<IChatFileAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('agentId', agentId);

    try {
      const response = await fetch(`${this.config.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        url: data.url || data.publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
      };
    } catch (error) {
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Updates the API configuration
   *
   * @param config - Partial configuration to update
   *
   * @example
   * ```typescript
   * client.updateConfig({ timeout: 60000 });
   * ```
   */
  updateConfig(config: Partial<IChatAPIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current API configuration
   *
   * @returns Current configuration
   */
  getConfig(): IChatAPIConfig {
    return { ...this.config };
  }
}

/**
 * Default singleton instance for convenience
 */
export const chatAPI = new ChatAPIClient();

/**
 * Factory function to create a new ChatAPIClient instance
 *
 * @param config - Optional configuration
 * @returns New ChatAPIClient instance
 *
 * @example
 * ```typescript
 * const customClient = createChatClient({
 *   baseUrl: '/custom/endpoint',
 * });
 * ```
 */
export const createChatClient = (config?: Partial<IChatAPIConfig>) => {
  return new ChatAPIClient(config);
};
