/* eslint-disable no-unused-vars */
/**
 * Stream processing utilities for chat responses
 */

import { TStreamChunk, TThinkingType } from '@react/features/ai-chat/types';

/** Function-specific thinking messages that cycle during function execution */
const FUNCTION_THINKING_MESSAGES = [
  'Using skill: {functionName}',
  'Still working on {functionName}',
  'Skills are like work, sometimes they take a while.',
  'Still working on {functionName}',
  'Double checking',
  'This is taking longer than usual. You can try waiting, or refresh the page.',
];

/** General thinking messages that cycle during processing */
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
 * @param data - Raw string data from stream
 * @returns Array of parsed JSON objects
 */
export const splitJSONStream = (data: string): TStreamChunk[] => {
  if (!data || typeof data !== 'string') return [];

  const cleanData = data.trim();
  if (!cleanData) return [];

  const jsonStrings = cleanData
    .split('}{')
    .map((str, index, array) => {
      let cleanStr = str.trim();

      if (!cleanStr) return null;

      if (index !== 0 && !cleanStr.startsWith('{')) {
        cleanStr = '{' + cleanStr;
      }

      if (index !== array.length - 1 && !cleanStr.endsWith('}')) {
        cleanStr += '}';
      }

      return cleanStr;
    })
    .filter(Boolean) as string[];

  const parsedChunks = jsonStrings
    .map((str) => {
      try {
        if (!str || str.length < 2 || !str.startsWith('{') || !str.endsWith('}')) {
          return null;
        }

        return JSON.parse(str) as TStreamChunk;
      } catch {
        return null;
      }
    })
    .filter((chunk): chunk is TStreamChunk => chunk !== null);

  return parsedChunks;
};

/**
 * Formats function name from snake_case to Title Case
 * @param functionName - Raw function name
 * @returns Formatted function name
 */
export const formatFunctionName = (functionName: string): string => {
  if (!functionName) return '';

  return functionName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Formats status message with proper function names and durations
 * @param statusMessage - Raw status message with placeholders
 * @returns Formatted status message
 */
export const formatStatusMessage = (statusMessage: string): string => {
  if (!statusMessage) return '';

  let formatted = statusMessage;

  const functionPattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  formatted = formatted.replace(functionPattern, (match, functionName) => {
    if (/^\d+\s*(ms|s|sec|seconds?|minutes?|mins?|hours?|hrs?)$/i.test(functionName)) {
      return functionName;
    }
    return formatFunctionName(functionName);
  });

  const durationPattern =
    /\{(\d+(?:\.\d+)?\s*(?:ms|s|sec|seconds?|minutes?|mins?|hours?|hrs?))\}/gi;
  formatted = formatted.replace(durationPattern, (_match, duration) => {
    return duration.trim();
  });

  const numberPattern = /\{(\d+(?:\.\d+)?)\}/g;
  formatted = formatted.replace(numberPattern, (_match, number) => {
    return `${number} ms`;
  });

  return formatted;
};

/**
 * Manages cycling through thinking messages with priority system
 */
class ThinkingMessageManager {
  private currentType: TThinkingType | null = null;
  private currentIndex: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private toolName: string = '';
  private callback: (message: string) => void;

  /** Starts thinking messages with optional tool name */
  start(callback: (message: string) => void, toolName?: string): void {
    this.stop();

    this.currentType = toolName ? 'tools' : 'general';
    this.callback = callback;
    this.currentIndex = 0;

    if (this.currentType === 'tools' && toolName) {
      this.toolName = formatFunctionName(toolName);
    }

    const initialMessage = this.getCurrentMessage();
    callback(initialMessage);

    const intervalTime = this.currentType === 'tools' ? 5000 : 3000;
    this.intervalId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.getMessagesArray().length;
      const message = this.getCurrentMessage();
      if (this.callback) this.callback(message);
    }, intervalTime);
  }

  /** Stops thinking messages and clears state */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentType = null;
    this.currentIndex = 0;
    this.toolName = '';
    this.callback = () => {};
  }

  private getCurrentMessage(): string {
    const messages = this.getMessagesArray();
    const messageTemplate = messages[this.currentIndex];

    if (this.currentType === 'tools') {
      return messageTemplate.replace('{functionName}', this.toolName);
    }

    return messageTemplate;
  }

  private getMessagesArray(): string[] {
    switch (this.currentType) {
      case 'tools':
        return FUNCTION_THINKING_MESSAGES;
      case 'general':
        return GENERAL_THINKING_MESSAGES;
      default:
        return [];
    }
  }
}

/** Creates a new ThinkingMessageManager instance */
export const createThinkingManager = (): ThinkingMessageManager => new ThinkingMessageManager();

/**
 * Processes a stream chunk and extracts relevant information
 * @param chunk - Stream chunk to process
 * @returns Processed chunk data
 */
export const processStreamChunk = (chunk: TStreamChunk) => {
  const errorMessage = chunk.error || (chunk.isError ? chunk.content : null);

  return {
    hasContent: Boolean(chunk.content && chunk.content.trim() !== ''),
    content: chunk.content || '',
    hasMetaMessages: Boolean(
      chunk.debugOn ||
        chunk.debug ||
        chunk.title ||
        chunk.callParams ||
        chunk.parameters ||
        chunk.function ||
        chunk.function_call ||
        chunk.status_message,
    ),
    metaMessages: {
      debug: chunk.debug || null,
      title: chunk.title || chunk.function_call?.name || null,
      callParams: chunk.callParams || null,
      parameters: chunk.parameters || null,
      function: chunk.function || null,
      functionCall: chunk.function_call || null,
      statusMessage: chunk.status_message || null,
    },
    hasError: Boolean(chunk.isError || (errorMessage && errorMessage.trim() !== '')),
    error: errorMessage || null,
  };
};
