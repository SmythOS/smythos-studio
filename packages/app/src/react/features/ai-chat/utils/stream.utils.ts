/* eslint-disable no-unused-vars */
/**
 * Stream processing utilities for chat responses
 * Handles JSON parsing, message formatting, and status updates
 * Updated: callback signatures now include TThinkingType parameter
 */

import { IStreamChunk, TThinkingType } from '@react/features/ai-chat/types/chat.types';

/**
 * Function-specific thinking messages that cycle during function execution
 */
const FUNCTION_THINKING_MESSAGES = [
  'Using skill: {functionName}',
  'Still working on {functionName}',
  'Skills are like work, sometimes they take a while.',
  'Still working on {functionName}',
  'Double checking',
  'This is taking longer than usual. You can try waiting, or refresh the page.',
];

/**
 * General thinking messages that cycle during processing
 */
const GENERAL_THINKING_MESSAGES = [
  'Thinking',
  'Still thinking',
  'Almost there',
  'Double checking',
  'Almost done',
  'This is taking longer than usual. You can try waiting, or refresh the page.',
];

/**
 * Splits concatenated JSON objects from stream
 * Handles edge cases like incomplete JSON, malformed chunks
 *
 * @param data - Raw string data from stream
 * @returns Array of parsed JSON objects
 *
 * @example
 * ```typescript
 * const data = '{"content":"Hello"}{"content":" World"}';
 * const chunks = splitJSONStream(data);
 * // Returns: [{ content: 'Hello' }, { content: ' World' }]
 * ```
 */
export const splitJSONStream = (data: string): IStreamChunk[] => {
  // Handle empty or invalid data
  if (!data || typeof data !== 'string') {
    return [];
  }

  const cleanData = data.trim();
  if (!cleanData) {
    return [];
  }

  // Split by '}{' pattern - common in streaming JSON
  const jsonStrings = cleanData
    .split('}{')
    .map((str, index, array) => {
      let cleanStr = str.trim();

      // Skip empty strings
      if (!cleanStr) {
        return null;
      }

      // Add opening brace if not first element
      if (index !== 0 && !cleanStr.startsWith('{')) {
        cleanStr = '{' + cleanStr;
      }

      // Add closing brace if not last element
      if (index !== array.length - 1 && !cleanStr.endsWith('}')) {
        cleanStr += '}';
      }

      return cleanStr;
    })
    .filter(Boolean) as string[];

  // Parse each JSON string
  const parsedChunks = jsonStrings
    .map((str) => {
      try {
        // Validate before parsing
        if (!str || str.length < 2 || !str.startsWith('{') || !str.endsWith('}')) {
          return null;
        }

        return JSON.parse(str) as IStreamChunk;
      } catch {
        // Silently skip invalid JSON
        return null;
      }
    })
    .filter((chunk): chunk is IStreamChunk => chunk !== null);

  return parsedChunks;
};

/**
 * Extracts function name from debug message content
 * Supports multiple debug message formats
 *
 * @param debugContent - Raw debug message content
 * @returns Extracted function name or null
 *
 * @example
 * ```typescript
 * extractFunctionName('[ABC123] Function Call : getUserData');
 * // Returns: 'getUserData'
 *
 * extractFunctionName('Call Response : processPayment');
 * // Returns: 'processPayment'
 * ```
 */
export const extractFunctionName = (debugContent: string): string | null => {
  if (!debugContent) {
    return null;
  }

  // Multiple patterns to extract function name from debug messages
  const patterns = [
    /(?:\[\w+\]\s+Function Call\s*:\s*)([a-zA-Z_][a-zA-Z0-9_]*)/,
    /(?:\[\w+\]\s+Call Response\s*:\s*)([a-zA-Z_][a-zA-Z0-9_]*)/,
    /(?:Function Call\s*:\s*)([a-zA-Z_][a-zA-Z0-9_]*)/,
    /(?:Call Response\s*:\s*)([a-zA-Z_][a-zA-Z0-9_]*)/,
    /^([a-zA-Z_][a-zA-Z0-9_]*)$/, // Just function name alone
  ];

  for (const pattern of patterns) {
    const match = debugContent.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Formats function name from snake_case to Title Case for display
 *
 * @param functionName - Raw function name
 * @returns Formatted function name
 *
 * @example
 * ```typescript
 * formatFunctionName('get_user_data');
 * // Returns: 'Get User Data'
 *
 * formatFunctionName('processPayment');
 * // Returns: 'Processpayment'
 * ```
 */
export const formatFunctionName = (functionName: string): string => {
  if (!functionName) {
    return '';
  }

  // Convert snake_case to Title Case
  return functionName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Formats status message with proper function names and durations
 * Replaces placeholders in curly braces with formatted values
 *
 * @param statusMessage - Raw status message with placeholders
 * @returns Formatted status message
 *
 * @example
 * ```typescript
 * formatStatusMessage('Calling {get_user_data} took {250} ms');
 * // Returns: 'Calling Get User Data took 250 ms'
 * ```
 */
export const formatStatusMessage = (statusMessage: string): string => {
  if (!statusMessage) {
    return '';
  }

  let formatted = statusMessage;

  // Pattern to match function names in curly braces: {function_name} or {functionName}
  const functionPattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  formatted = formatted.replace(functionPattern, (match, functionName) => {
    // Check if this looks like a duration (contains numbers and time units)
    if (/^\d+\s*(ms|s|sec|seconds?|minutes?|mins?|hours?|hrs?)$/i.test(functionName)) {
      // This is actually a duration, not a function name
      return functionName;
    }
    // Format as function name
    return formatFunctionName(functionName);
  });

  // Pattern to match durations in curly braces: {50 ms}, {2 seconds}, etc.
  const durationPattern =
    /\{(\d+(?:\.\d+)?\s*(?:ms|s|sec|seconds?|minutes?|mins?|hours?|hrs?))\}/gi;
  formatted = formatted.replace(durationPattern, (_match, duration) => {
    // Clean up the duration formatting
    return duration.trim();
  });

  // Pattern to match pure numbers in curly braces that might be durations: {50}
  const numberPattern = /\{(\d+(?:\.\d+)?)\}/g;
  formatted = formatted.replace(numberPattern, (_match, number) => {
    // Assume it's milliseconds if it's just a number
    return `${number} ms`;
  });

  return formatted;
};

/**
 * Unified thinking message manager
 * Manages cycling through thinking messages with priority system
 */
export class ThinkingMessageManager {
  private currentType: TThinkingType | null = null;
  private currentIndex: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private functionName: string = '';
  private statusMessage: string = '';
  private callback: ((message: string, type: TThinkingType) => void) | null = null;

  /**
   * Starts thinking messages with priority system
   * Priority: status (3) > function (2) > general (1)
   *
   * @param type - Type of thinking message
   * @param callback - Callback to invoke with updated messages
   * @param functionName - Function name for function type
   * @param statusMessage - Status message for status type
   */
  start(
    type: TThinkingType,
    callback: (message: string, type: TThinkingType) => void,
    functionName?: string,
    statusMessage?: string,
  ): void {
    // Priority system: status > function > general
    const priorityOrder: Record<TThinkingType, number> = { status: 3, function: 2, general: 1 };
    const currentPriority = this.currentType ? priorityOrder[this.currentType] : 0;
    const newPriority = priorityOrder[type];

    // Only start new thinking if it has higher or equal priority
    if (newPriority < currentPriority) {
      return; // Don't override higher priority thinking
    }

    // Stop any existing thinking
    this.stop();

    this.currentType = type;
    this.callback = callback;
    this.currentIndex = 0;

    if (type === 'function' && functionName) {
      this.functionName = functionName;
    }
    if (type === 'status' && statusMessage) {
      this.statusMessage = formatStatusMessage(statusMessage);
    }

    // Show first message immediately
    const initialMessage = this.getCurrentMessage();
    callback(initialMessage, type);

    // Start interval only for general and function types
    if (type !== 'status') {
      const intervalTime = type === 'function' ? 5000 : 3000;
      this.intervalId = setInterval(() => {
        this.currentIndex = (this.currentIndex + 1) % this.getMessagesArray().length;
        const message = this.getCurrentMessage();
        if (this.callback && this.currentType) {
          this.callback(message, this.currentType);
        }
      }, intervalTime);
    }
  }

  /**
   * Updates status message for status type thinking
   *
   * @param newStatusMessage - New status message
   */
  updateStatus(newStatusMessage: string): void {
    if (this.currentType === 'status' && this.callback) {
      const formattedMessage = formatStatusMessage(newStatusMessage);
      this.statusMessage = formattedMessage;
      this.callback(formattedMessage, 'status');
    }
  }

  /**
   * Stops thinking messages and clears state
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentType = null;
    this.currentIndex = 0;
    this.functionName = '';
    this.statusMessage = '';
    this.callback = null;
  }

  /**
   * Gets current thinking type
   *
   * @returns Current thinking type or null
   */
  getCurrentType(): TThinkingType | null {
    return this.currentType;
  }

  /**
   * Gets current message with placeholders replaced
   */
  private getCurrentMessage(): string {
    if (this.currentType === 'status') {
      return this.statusMessage;
    }

    const messages = this.getMessagesArray();
    const messageTemplate = messages[this.currentIndex];

    if (this.currentType === 'function') {
      return messageTemplate.replace('{functionName}', this.functionName);
    }

    return messageTemplate;
  }

  /**
   * Gets messages array for current type
   */
  private getMessagesArray(): string[] {
    switch (this.currentType) {
      case 'function':
        return FUNCTION_THINKING_MESSAGES;
      case 'general':
        return GENERAL_THINKING_MESSAGES;
      default:
        return [];
    }
  }
}

/**
 * Processes a chunk from the stream and extracts relevant information
 *
 * @param chunk - Stream chunk to process
 * @returns Processed information
 */
export const processStreamChunk = (chunk: IStreamChunk) => {
  return {
    hasContent: Boolean(chunk.content && chunk.content.trim() !== ''),
    hasDebug: Boolean(chunk.debug),
    hasError: Boolean(chunk.error || chunk.isError),
    hasFunctionCall: Boolean(chunk.function_call || chunk.function),
    hasStatusMessage: Boolean(chunk.status_message),
    functionName: chunk.function || chunk.function_call?.name || null,
    statusMessage: chunk.status_message || null,
    content: chunk.content || '',
    error: chunk.error || null,
  };
};

/**
 * Creates a singleton instance of ThinkingMessageManager
 */
export const createThinkingManager = (): ThinkingMessageManager => new ThinkingMessageManager();
