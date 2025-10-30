/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { IMessageFile } from '@react/features/ai-chat/types/chat.types';
import config from '@src/builder-ui/config';

type GenerateResponseInput = {
  agentId: string;
  chatId: string;
  query: string;
  attachments?: { url: string; name?: string; type?: string; size?: number }[];
  signal: AbortSignal;
  onResponse: (value: string, errorInfo?: { isError?: boolean; errorType?: string }) => void;
  onStart: () => void;
  onEnd: () => void;
  onThinking?: (thinking: { message: string }) => void;
};

type ResponseFormat = {
  role?: string;
  content?: string;
  debug?: string;
  title?: string;
  status_message?: string;
  function?: string;
  function_call?: { name?: string; arguments?: any[] };
  error?: string;
  isError?: boolean;
  errorType?: string;
};

// Function-specific thinking messages that cycle every 5 seconds
const FUNCTION_THINKING_MESSAGES = [
  'Using skill: {functionName}',
  'Still working on {functionName}',
  'Skills are like work, sometimes they take a while.',
  'Still working on {functionName}',
  'Double checking',
  'This is taking longer than usual. You can try waiting, or refresh the page.',
];

// General thinking messages that cycle every 3 seconds
const GENERAL_THINKING_MESSAGES = [
  'Thinking',
  'Still thinking',
  'Almost there',
  'Double checking',
  'Almost done',
  'This is taking longer than usual. You can try waiting, or refresh the page.',
];

// Thinking message types
type ThinkingType = 'general' | 'function' | 'status';

// Unified thinking message manager
class UnifiedThinkingManager {
  private currentType: ThinkingType | null = null;
  private currentIndex: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  private functionName: string = '';
  private statusMessage: string = '';
  private onThinking: ((thinking: { message: string }) => void) | null = null;

  start(
    type: ThinkingType,
    onThinking: (thinking: { message: string }) => void,
    functionName?: string,
    statusMessage?: string,
  ): void {
    // Priority system: status > function > general
    const priorityOrder = { status: 3, function: 2, general: 1 };
    const currentPriority = this.currentType ? priorityOrder[this.currentType] : 0;
    const newPriority = priorityOrder[type];

    // Only start new thinking if it has higher or equal priority
    if (newPriority < currentPriority) {
      return; // Don't override higher priority thinking
    }

    // Stop any existing thinking
    this.stop();

    this.currentType = type;
    this.onThinking = onThinking;
    this.currentIndex = 0;

    if (type === 'function' && functionName) {
      this.functionName = functionName;
    }
    if (type === 'status' && statusMessage) {
      this.statusMessage = statusMessage;
    }

    // Show first message immediately
    const initialMessage = this.getCurrentMessage();
    onThinking({ message: initialMessage });

    // Start interval only for general and function types
    if (type !== 'status') {
      const intervalTime = type === 'function' ? 5000 : 3000;
      this.intervalId = setInterval(() => {
        this.currentIndex = (this.currentIndex + 1) % this.getMessagesArray().length;
        const message = this.getCurrentMessage();
        onThinking({ message });
      }, intervalTime);
    }
  }

  updateStatus(newStatusMessage: string): void {
    if (this.currentType === 'status' && this.onThinking) {
      // Format the status message before storing and displaying
      const formattedMessage = chatUtils.formatStatusMessage(newStatusMessage);
      this.statusMessage = formattedMessage;
      this.onThinking({ message: formattedMessage });
    }
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.currentType = null;
    this.currentIndex = 0;
    this.functionName = '';
    this.statusMessage = '';
    this.onThinking = null;
  }

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

  getCurrentType(): ThinkingType | null {
    return this.currentType;
  }
}

export const chatUtils = {
  // Unified thinking message manager
  thinkingManager: new UnifiedThinkingManager(),

  /**
   * Handles status message display with priority system
   * @param statusMessage - The status message to display
   * @param onThinking - Callback function for thinking updates
   * @returns true if status message was handled, false otherwise
   */
  handleStatusMessage: (
    statusMessage: string | undefined,
    onThinking: (thinking: { message: string }) => void,
  ): boolean => {
    if (statusMessage) {
      // Format the status message for better display
      const formattedStatusMessage = chatUtils.formatStatusMessage(statusMessage);
      chatUtils.thinkingManager.start('status', onThinking, undefined, formattedStatusMessage);
      return true;
    }
    return false;
  },

  /**
   * Extracts function name from debug message for user-friendly display
   * @param debugContent - The raw debug message content
   * @returns The extracted function name or null if not found
   */
  extractFunctionNameFromDebug: (debugContent: string): string | null => {
    // Multiple patterns to extract function name from debug messages:
    // 1. "[ID] Function Call : name" - from toolsInfoHandler
    // 2. "[ID] Call Response : name" - from afterToolCallHandler
    // 3. "Function Call : name" - without ID
    // 4. "Call Response : name" - without ID
    // 5. "name" - just function name alone
    const patterns = [
      /(?:\[\w+\]\s+Function Call\s*:\s*)([a-zA-Z_][a-zA-Z0-9_]*)/,
      /(?:\[\w+\]\s+Call Response\s*:\s*)([a-zA-Z_][a-zA-Z0-9_]*)/,
      /(?:Function Call\s*:\s*)([a-zA-Z_][a-zA-Z0-9_]*)/,
      /(?:Call Response\s*:\s*)([a-zA-Z_][a-zA-Z0-9_]*)/,
      /^([a-zA-Z_][a-zA-Z0-9_]*)$/, // Just function name alone (like 'get_destinations')
    ];

    const result =
      patterns
        .map((pattern) => debugContent.match(pattern))
        .find((match) => match && match[1])
        ?.at(1) ?? null;

    return result;
  },

  /**
   * Formats function name for user-friendly display
   * @param functionName - The raw function name
   * @returns Formatted function name for display
   */
  formatFunctionNameForDisplay: (functionName: string): string => {
    // Convert snake_case to Title Case for better readability
    const formatted = functionName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return formatted;
  },

  /**
   * Formats status message with proper function name and duration display
   * @param statusMessage - The raw status message containing function names and durations in curly braces
   * @returns Formatted status message for user display
   */
  formatStatusMessage: (statusMessage: string): string => {
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
      return chatUtils.formatFunctionNameForDisplay(functionName);
    });

    // Pattern to match durations in curly braces: {50 ms}, {2 seconds}, etc.
    const durationPattern =
      /\{(\d+(?:\.\d+)?\s*(?:ms|s|sec|seconds?|minutes?|mins?|hours?|hrs?))\}/gi;
    formatted = formatted.replace(durationPattern, (match, duration) => {
      // Clean up the duration formatting
      return duration.trim();
    });

    // Pattern to match pure numbers in curly braces that might be durations: {50}
    const numberPattern = /\{(\d+(?:\.\d+)?)\}/g;
    formatted = formatted.replace(numberPattern, (match, number) => {
      // Assume it's milliseconds if it's just a number
      return `${number} ms`;
    });

    return formatted;
  },
  getChatStreamURL: (agentId: string, isLocal = false) => {
    const remoteDomain = config.env.IS_DEV ? 'agent.stage.smyth.ai' : 'agent.a.smyth.ai';
    return isLocal
      ? `http://${agentId}.localagent.stage.smyth.ai:3000`
      : `https://${agentId}.${remoteDomain}`;
  },
  splitDataToJSONObjects: (data: string) => {
    // Handle empty or invalid data
    if (!data || typeof data !== 'string') return [];

    // Clean the data first - remove any incomplete JSON chunks
    const cleanData = data.trim();
    if (!cleanData) return [];

    // Split by '}{' but handle edge cases
    const jsonStrings = cleanData
      .split('}{')
      .map((str, index, array) => {
        let cleanStr = str.trim();

        // Skip empty strings
        if (!cleanStr) return null;

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

    const result = jsonStrings
      .map((str) => {
        try {
          // Additional validation before parsing
          if (!str || str.length < 2) return null;

          // Check if it looks like JSON
          if (!str.startsWith('{') || !str.endsWith('}')) return null;

          return JSON.parse(str) as ResponseFormat;
        } catch (error) {
          // Silently skip invalid JSON instead of logging errors
          return null;
        }
      })
      .filter(Boolean);

    return result;
  },
  generateResponse: async (input: GenerateResponseInput) => {
    let message = '';

    // Enhanced Message State Management
    type MessageState = 'initial' | 'debug' | 'final';
    let messageState: MessageState = 'initial';

    // Smooth Transition Handler
    const handleMessageTransition = (newState: MessageState) => {
      if (messageState === 'initial' && newState === 'debug') {
        // Don't clear message immediately when debug starts - keep the processing message
        // The message will be cleared only when debug ends and content starts arriving
      } else if (messageState === 'debug' && newState === 'final') {
        // Clear and prepare for final content - only when debug is completely finished
        // Don't clear message here - let content accumulate naturally
        // Add a line break to separate thinking from content if message doesn't end with newline
        if (message.length > 0 && !message.endsWith('\n')) {
          message = `${message}\n`;
        }
        input.onResponse(''); // Clear UI display to show fresh content
      }
      messageState = newState;
    };

    // Enhanced Error Handler
    const handleErrorGracefully = (error: string) => {
      const errorMessage = 'Sorry, something went wrong. Please try again.';
      input.onResponse(errorMessage);
    };

    try {
      let openAiResponse: Response;
      try {
        openAiResponse = await fetch('/api/page/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AGENT-ID': input.agentId,
            'x-conversation-id': input.chatId,
            'x-enable-meta-messages': 'true',
          },
          body: JSON.stringify({
            message: input.query,
            attachments: input.attachments,
          }),
          signal: input.signal,
        });
      } catch (fetchError) {
        throw new Error(
          `Network request failed: ${fetchError.message || fetchError.error || 'Unknown error'}`,
        );
      }

      if (!openAiResponse || openAiResponse?.status !== 200) {
        try {
          const errorData = await openAiResponse.json();
          const errorMessage = errorData?.error || 'Failed to get a valid response';
          throw new Error(errorMessage);
        } catch (parseError) {
          // If JSON parsing fails, use a generic error message
          throw new Error(`HTTP ${openAiResponse?.status}: Failed to get a valid response`);
        }
      }

      const reader = openAiResponse.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader - response body is null');
      }
      let accumulatedData = '';

      input.onStart();

      while (true) {
        try {
          const { done, value } = await reader.read();

          if (input.signal.aborted) {
            reader.cancel();
            throw new DOMException('Aborted', 'AbortError');
          }

          if (done) break;

          const decodedValue = new TextDecoder().decode(value);
          accumulatedData += decodedValue;
        } catch (streamError) {
          // Handle stream reading errors
          reader.cancel();
          throw new Error(`Stream reading failed: ${streamError.message}`);
        }

        // Only process if we have complete JSON objects
        let jsonObjects: ResponseFormat[] = [];
        try {
          jsonObjects = chatUtils.splitDataToJSONObjects(accumulatedData);
        } catch (parseError) {
          // Handle JSON parsing errors gracefully - skip this chunk and continue processing
          continue;
        }

        // First pass: Check for state transitions and start thinking if needed
        for (const jsonObject of jsonObjects) {
          if (jsonObject.debug && messageState === 'initial') {
            handleMessageTransition('debug');
            // Start general thinking when debug begins
            if (input.onThinking) {
              chatUtils.thinkingManager.start('general', input.onThinking);
            }
            break;
          }
        }

        // Second pass: Process all messages
        for (const jsonObject of jsonObjects) {
          if (jsonObject.error) {
            handleErrorGracefully(jsonObject.error);
            throw new Error(jsonObject.error);
          }

          // Check for status_message at the top level - highest priority
          if (
            input.onThinking &&
            chatUtils.handleStatusMessage(jsonObject.status_message, input.onThinking)
          ) {
            // Status message handled, continue to next object
            continue;
          }

          if (jsonObject.debug) {
            // Handle debug messages with dynamic thinking system
            const debugContent = jsonObject.debug;

            // Try to extract function name from debug message
            let functionName = chatUtils.extractFunctionNameFromDebug(debugContent);

            // If debug content is just a function name (like 'get_destinations'), use it directly
            if (!functionName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(debugContent.trim())) {
              functionName = debugContent.trim();
            }

            if (functionName) {
              // If we can extract a function name, use dynamic thinking messages
              const formattedFunctionName = chatUtils.formatFunctionNameForDisplay(functionName);

              // Start function-specific thinking
              if (input.onThinking) {
                chatUtils.thinkingManager.start(
                  'function',
                  input.onThinking,
                  formattedFunctionName,
                );
              }
            } else if (jsonObject.function) {
              // If function field exists, use it directly
              const formattedFunctionName = chatUtils.formatFunctionNameForDisplay(
                jsonObject.function,
              );

              // Start function-specific thinking
              if (input.onThinking) {
                chatUtils.thinkingManager.start(
                  'function',
                  input.onThinking,
                  formattedFunctionName,
                );
              }
            } else {
              // Check for status_message first - highest priority
              if (
                input.onThinking &&
                chatUtils.handleStatusMessage(jsonObject.status_message, input.onThinking)
              ) {
                // Status message handled, skip function name extraction
              } else {
                // Try to extract function name from debug title if not found in debug content
                const debugTitle = jsonObject.title || '';
                const functionNameFromTitle = chatUtils.extractFunctionNameFromDebug(debugTitle);

                if (functionNameFromTitle) {
                  const formattedFunctionName =
                    chatUtils.formatFunctionNameForDisplay(functionNameFromTitle);

                  // Start function-specific thinking
                  if (input.onThinking) {
                    chatUtils.thinkingManager.start(
                      'function',
                      input.onThinking,
                      formattedFunctionName,
                    );
                  }
                }
                // If no function name found, continue with current thinking type
              }
            }
          }

          if (jsonObject.function_call) {
            // Check for status_message first - highest priority
            if (
              input.onThinking &&
              chatUtils.handleStatusMessage(jsonObject.status_message, input.onThinking)
            ) {
              // Status message handled, skip function call processing
            } else {
              // Handle function calls with dynamic thinking messages
              const functionName =
                jsonObject.function || jsonObject.function_call?.name || 'Unknown';

              const formattedFunctionName = chatUtils.formatFunctionNameForDisplay(functionName);

              // Start function-specific thinking
              if (input.onThinking) {
                chatUtils.thinkingManager.start(
                  'function',
                  input.onThinking,
                  formattedFunctionName,
                );
              }
            }
          }

          if (jsonObject.content && jsonObject.content !== '') {
            // Handle final content transition - only when we're actually getting content
            if (messageState === ('debug' as MessageState)) {
              handleMessageTransition('final');
            }

            // Stop all thinking messages when content starts arriving
            chatUtils.thinkingManager.stop();

            // Handle streaming content - append to message
            const content = jsonObject.content || '';
            if (content) {
              // For first content after debug, start fresh message with proper line break
              if (messageState === ('final' as MessageState) && message === '') {
                message = content;
              } else if (messageState === 'initial' && message === '') {
                // For content without any thinking (initial state), start fresh
                message = content;
              } else {
                // Append content to existing message for streaming Response
                message = message.length > 0 ? `${message}${content}` : content;
              }
            }

            // INSTANT DISPLAY: Show response immediately with error flags if present
            input.onResponse(message, {
              isError: jsonObject.isError || false,
              errorType: jsonObject.errorType || undefined,
            });
          }
        }

        // Clear accumulated data after processing all JSON objects
        // Only clear if we successfully processed some objects
        if (jsonObjects.length > 0) {
          accumulatedData = '';
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        input.onResponse('Request was cancelled');
      } else {
        handleErrorGracefully(error.message);
      }
      throw error;
    } finally {
      // Stop all thinking messages when response ends
      chatUtils.thinkingManager.stop();
      input.onEnd();
    }

    return message;
  },
  extractFirstSentence: (paragraph: string): string => {
    const sentenceEndRegex = /([.!?])\s/;
    const match = paragraph.match(sentenceEndRegex);
    if (match) return paragraph.substring(0, match.index + 1).trim();
    return paragraph.trim();
  },
};

export const createFileFromText = (content: string): IMessageFile => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `text-${timestamp}.txt`;
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], name, { type: 'text/plain' });
  const id = `text-${timestamp}`;

  return { file, metadata: { fileType: 'text/plain', isUploading: false }, id };
};
