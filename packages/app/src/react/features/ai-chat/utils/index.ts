/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any  */
import config from '@src/builder-ui/config';
import { FileWithMetadata } from '@src/react/shared/types/chat.types';

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
      this.statusMessage = newStatusMessage;
      this.onThinking({ message: newStatusMessage });
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
        // console.log('Debug ended - clearing message for final content');
        input.onResponse('');
      }
      messageState = newState;
    };

    // Enhanced Error Handler
    const handleErrorGracefully = (error: string) => {
      const errorMessage = 'Sorry, something went wrong. Please try again.';
      input.onResponse(errorMessage);
    };

    try {
      const openAiResponse = await fetch('/api/page/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AGENT-ID': input.agentId,
          'x-conversation-id': input.chatId,
          'x-ai-agent': 'true',
        },
        body: JSON.stringify({
          message: input.query,
          attachments: input.attachments,
        }),
        signal: input.signal,
      });

      if (!openAiResponse || openAiResponse?.status !== 200) {
        const { error } = await openAiResponse.json();
        throw new Error(error || 'Failed to get a valid response');
      }

      const reader = openAiResponse.body.getReader();
      let accumulatedData = '';

      input.onStart();

      // Start general thinking messages when response starts
      if (input.onThinking) {
        chatUtils.thinkingManager.start('general', input.onThinking);
      }

      let chunkCount = 0;
      while (true) {
        chunkCount++;

        const { done, value } = await reader.read();

        if (input.signal.aborted) {
          reader.cancel();
          throw new DOMException('Aborted', 'AbortError');
        }

        if (done) break;

        const decodedValue = new TextDecoder().decode(value);
        accumulatedData += decodedValue;

        // Only process if we have complete JSON objects
        const jsonObjects: ResponseFormat[] = chatUtils.splitDataToJSONObjects(accumulatedData);

        // First pass: Check for state transitions
        for (const jsonObject of jsonObjects) {
          if (jsonObject.debug && messageState === 'initial') {
            handleMessageTransition('debug');
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
          if (jsonObject.status_message) {
            const statusMessage = jsonObject.status_message;

            // Show status message directly - no interval needed
            if (input.onThinking) {
              chatUtils.thinkingManager.start('status', input.onThinking, undefined, statusMessage);
            }
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
              const statusMessage = jsonObject.status_message || '';

              if (statusMessage) {
                // Show status message directly - no interval needed
                if (input.onThinking) {
                  chatUtils.thinkingManager.start(
                    'status',
                    input.onThinking,
                    undefined,
                    statusMessage,
                  );
                }
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
            const statusMessage = jsonObject.status_message || '';

            if (statusMessage) {
              // Show status message directly - no interval needed
              if (input.onThinking) {
                chatUtils.thinkingManager.start(
                  'status',
                  input.onThinking,
                  undefined,
                  statusMessage,
                );
              }
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
              // Safely concatenate content without causing JSON parsing issues
              const content = jsonObject.content || '';
              if (content) {
                message += message.length > 0 ? '\n' + content : content;
              }
            }

            // Stop all thinking messages when content starts arriving
            chatUtils.thinkingManager.stop();

            // Handle regular content - response shows immediately
            message += jsonObject.content;

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

export const createFileFromText = (content: string): FileWithMetadata => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `text-${timestamp}.txt`;
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], name, { type: 'text/plain' });
  const id = `text-${timestamp}`;

  return { file, metadata: { fileType: 'text/plain', isUploading: false }, id };
};
