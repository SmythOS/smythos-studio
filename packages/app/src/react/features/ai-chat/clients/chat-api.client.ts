/**
 * Modern Chat API Client with Streaming Support
 * Provides a clean, professional interface for chat operations
 */

import {
  IStreamCallbacks,
  TAPIConfig,
  TChatError,
  TChatParams,
  TStreamChunk,
  TStreamConfig,
} from '@react/features/ai-chat/types';
import { parseChunk, parseStreamChunks, performanceMonitor } from '@react/features/ai-chat/utils';
import { CreateChatRequest } from '@react/shared/types/api-payload.types';
import { CreateChatsResponse } from '@react/shared/types/api-results.types';

/**
 * Default configuration for the Chat API Client
 */
const DEFAULT_CONFIG: TAPIConfig = {
  baseUrl: '/api/page/chat',
  defaultHeaders: { 'Content-Type': 'application/json' },
};

/**
 * Chat API Client class
 * Handles all communication with the chat service including streaming responses
 */
export class ChatAPIClient {
  private config: TAPIConfig;

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
  constructor(config: Partial<TAPIConfig> = {}) {
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
  async streamChat(streamConfig: TStreamConfig, callbacks: IStreamCallbacks): Promise<void> {
    const { agentId, chatId, message, modelId, attachments, signal, headers = {} } = streamConfig;
    const { onContent, onMetaMessages, onError, onStart, onComplete } = callbacks;

    // State management for stream processing
    let accumulatedData = ''; // eslint-disable-line prefer-const
    let reader: ReadableStreamDefaultReader<Uint8Array<ArrayBufferLike>> | undefined;

    try {
      // Validate required parameters
      // Message can be empty if attachments are provided
      if (!agentId || !chatId || (!message && (!attachments || attachments.length === 0))) {
        const error: TChatError = {
          message: 'Missing required parameters: agentId, chatId, or message',
          type: 'system',
        };
        // Throw to be handled by catch block
        throw error;
      }

      // Start performance monitoring
      performanceMonitor.startStream();

      // Notify stream start
      if (onStart) onStart();

      // Prepare request headers with optional model override
      const requestHeaders: Record<string, string> = {
        ...this.config.defaultHeaders,
        'X-AGENT-ID': agentId,
        'x-conversation-id': chatId,
        ...(modelId ? { 'x-model-id': modelId } : {}), // Include model override if provided
        ...headers,
      };


      const requestBody = { message, attachments, enableMetaMessages: true };

      // Make streaming request
      const response = await fetch(`${this.config.baseUrl}/stream`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
        signal,
        credentials: 'include', // Required for session cookie
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        const error: TChatError = {
          message: errorData.message || `HTTP ${response.status}: Failed to get response`,
          type: 'network',
        };
        // Don't call onError here - let the catch block handle it to avoid duplicate error handling
        throw error;
      }

      // Get stream reader
      reader = response.body?.getReader();
      if (!reader) {
        const error: TChatError = {
          message: 'Failed to get response reader - response body is null',
          type: 'stream',
        };
        // Don't call onError here - let the catch block handle it to avoid duplicate error handling
        throw error;
      }

      // Process stream
      await this.processStream(reader, signal, accumulatedData, {
        onContent,
        onMetaMessages,
      });

      // End performance monitoring
      performanceMonitor.endStream();

      onComplete();
    } catch (error) {
      // Handle different error types
      const chatError = this.handleStreamError(error, signal);

      // End performance monitoring on error
      performanceMonitor.endStream();

      // Notify error callback (single point of error notification)
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
    callbacks: Pick<IStreamCallbacks, 'onContent' | 'onMetaMessages'>,
  ): Promise<void> {
    const { onContent, onMetaMessages } = callbacks;
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

      // Record chunk arrival for performance monitoring
      performanceMonitor.recordChunkArrival(decodedValue, 'content');

      // Parse JSON chunks
      const processingStart = performance.now();
      const chunks = parseStreamChunks(accumulatedData);
      const processingTime = performance.now() - processingStart;

      // Record processing time if we parsed chunks
      if (chunks.length > 0 && performanceMonitor.isEnabled()) {
        performanceMonitor.recordProcessingTime(0, processingTime);
      }

      if (chunks.length === 0) continue; // Wait for more complete data

      // Process each chunk
      for (const chunk of chunks) {
        await this.processChunk(chunk, { onContent, onMetaMessages });
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
    chunk: TStreamChunk,
    callbacks: Pick<IStreamCallbacks, 'onContent' | 'onMetaMessages'>,
  ): Promise<void> {
    const { onContent, onMetaMessages } = callbacks;
    const processed = parseChunk(chunk);

    // Handle errors - throw to stop stream processing, catch block will handle error notification
    if (processed.hasError) {
      const error: TChatError = {
        type: 'stream',
        message: processed.error || 'Unknown error occurred',
      };
      throw error;
    }

    // Handle status messages (highest priority)
    if (processed.hasMetaMessages && onMetaMessages) {
      onMetaMessages(processed.metaMessages);
      return;
    }

    // Handle content (final response)
    if (processed.hasContent) {
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
  private handleStreamError(error: unknown, signal: AbortSignal): TChatError {
    // Check if this is an abort error
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        message: signal.aborted ? 'Request was cancelled' : 'Stream was aborted',
        type: 'abort',
        isAborted: true,
        originalError: error,
      };
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        message: `Network request failed: ${error.message}`,
        type: 'network',
        originalError: error,
      };
    }

    // Handle generic errors
    if (error instanceof Error) {
      return {
        message: error.message || 'An unexpected error occurred',
        type: 'system',
        originalError: error,
      };
    }

    // Unknown error type
    return {
      message: 'An unexpected error occurred. Please try again.',
      type: 'system',
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
   * Creates a new chat conversation
   *
   * @param data - Chat creation parameters
   * @returns Promise resolving to the created chat data
   * @throws {Error} If the request fails
   *
   * @example
   * ```typescript
   * const chat = await client.createChat({
   *   conversation: {
   *     summary: '',
   *     chunkSize: 100,
   *     lastChunkID: '0',
   *     label: 'New Chat',
   *     aiAgentId: 'agent-123',
   *   },
   * });
   * ```
   */
  async createChat(data: CreateChatRequest): Promise<CreateChatsResponse> {
    const response = await fetch(`${this.config.baseUrl}/new`, {
      method: 'POST',
      headers: this.config.defaultHeaders,
      body: JSON.stringify(data),
      credentials: 'include', // Required for session cookie
    });

    if (!response.ok) {
      const errorData = await this.parseErrorResponse(response);
      throw new Error(errorData.message || `Failed to create chat: ${response.statusText}`);
    }

    return response.json() as Promise<CreateChatsResponse>;
  }

  /**
   * Fetches chat configuration parameters for an agent
   *
   * @param agentId - The agent ID to fetch params for
   * @returns Promise resolving to chat params
   * @throws {Error} If the request fails
   *
   * @example
   * ```typescript
   * const params = await client.getChatParams('agent-123');
   * console.log(params.chatbotEnabled);
   * ```
   */
  async getChatParams(agentId: string): Promise<TChatParams> {
    const response = await fetch(`${this.config.baseUrl}/params`, {
      method: 'GET',
      headers: {
        ...this.config.defaultHeaders,
        'X-AGENT-ID': agentId,
      },
      credentials: 'include', // Required for session cookie
    });

    if (!response.ok) {
      const errorData = await this.parseErrorResponse(response);
      throw new Error(errorData.message || `Failed to fetch chat params: ${response.statusText}`);
    }

    return response.json() as Promise<TChatParams>;
  }
}
