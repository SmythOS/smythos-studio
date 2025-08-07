/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any  */
import config from '@src/builder-ui/config';
import { FileWithMetadata } from '@src/react/shared/types/chat.types';

type GenerateResponseInput = {
  agentId: string;
  chatId: string;
  query: string;
  fileKeys?: string[];
  signal: AbortSignal;
  onResponse: (value: string) => void;
  onStart: () => void;
  onEnd: () => void;
  onThinking?: (thinking: { message: string }) => void;
};

type ResponseFormat = {
  role?: string;
  content?: string;
  debug?: string;
  title?: string;
  function?: string;
  function_call?: { name?: string; arguments?: any[] };
  error?: string;
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

export const chatUtils = {
  // Manages dynamic thinking messages that cycle every 5 seconds for function calls
  thinkingMessageManager: {
    currentIndex: 0,
    intervalId: null as NodeJS.Timeout | null,
    functionName: '',

    start: function (
      this: any,
      functionName: string,
      onThinking: (thinking: { message: string }) => void,
    ) {
      // Clear any existing interval
      if (this.intervalId) clearInterval(this.intervalId);

      this.functionName = functionName;
      this.currentIndex = 0;

      // INSTANT DISPLAY: Show first message immediately
      const initialMessage = this.getCurrentMessage();
      onThinking({ message: initialMessage });

      // Start cycling through messages every 5 seconds (starting from second message)
      this.intervalId = setInterval(() => {
        this.currentIndex = (this.currentIndex + 1) % FUNCTION_THINKING_MESSAGES.length;
        const message = this.getCurrentMessage();
        onThinking({ message });
      }, 5000);
    },

    stop: function (this: any) {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    },

    getCurrentMessage: function (this: any): string {
      const messageTemplate = FUNCTION_THINKING_MESSAGES[this.currentIndex];
      return messageTemplate.replace('{functionName}', this.functionName);
    },
  },

  // Manages general thinking messages that cycle every 3 seconds when no function is called
  generalThinkingMessageManager: {
    currentIndex: 0,
    intervalId: null as NodeJS.Timeout | null,

    start: function (this: any, onThinking: (thinking: { message: string }) => void) {
      // Clear any existing interval
      if (this.intervalId) clearInterval(this.intervalId);

      this.currentIndex = 0;

      // INSTANT DISPLAY: Show first message immediately
      const initialMessage = this.getCurrentMessage();
      onThinking({ message: initialMessage });

      // Start cycling through messages every 3 seconds (starting from second message)
      this.intervalId = setInterval(() => {
        this.currentIndex = (this.currentIndex + 1) % GENERAL_THINKING_MESSAGES.length;
        const message = this.getCurrentMessage();
        onThinking({ message });
      }, 3000);
    },

    stop: function (this: any) {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    },

    getCurrentMessage: function (this: any): string {
      return GENERAL_THINKING_MESSAGES[this.currentIndex];
    },
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
  getChatStreamURL: (agentId: string, isLocal = false) => {
    const remoteDomain = config.env.IS_DEV ? 'agent.stage.smyth.ai' : 'agent.a.smyth.ai';
    return isLocal
      ? `http://${agentId}.localagent.stage.smyth.ai:3000`
      : `https://${agentId}.${remoteDomain}`;
  },
  splitDataToJSONObjects: (data: string) => {
    const jsonStrings = data.split('}{').map((str, index, array) => {
      if (index !== 0) str = '{' + str;
      if (index !== array.length - 1) str += '}';
      return str;
    });

    const result = jsonStrings
      .map((str) => {
        try {
          return JSON.parse(str) as ResponseFormat;
        } catch (error) {
          console.error('Error parsing JSON:', error); // eslint-disable-line no-console
          return null;
        }
      })
      .filter(Boolean);

    return result;
  },
  generateResponse: async (input: GenerateResponseInput) => {
    let message = '';
    let isFunctionCallActive = false;
    let isGeneralThinkingActive = false;

    // Enhanced Message State Management
    type MessageState = 'initial' | 'debug' | 'final';
    let messageState: MessageState = 'initial';

    // Smooth Transition Handler
    const handleMessageTransition = (newState: MessageState) => {
      if (messageState === 'initial' && newState === 'debug') {
        // Show processing message instead of empty
        const processingMessage = 'Processing your request...';
        input.onResponse(processingMessage);
      } else if (messageState === 'debug' && newState === 'final') {
        // Clear and prepare for final content
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
        body: JSON.stringify({ message: input.query, fileKeys: input.fileKeys }),
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
        isGeneralThinkingActive = true;
        chatUtils.generalThinkingMessageManager.start(input.onThinking);
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

              // Stop general thinking and start function-specific thinking
              if (isGeneralThinkingActive) {
                chatUtils.generalThinkingMessageManager.stop();
                isGeneralThinkingActive = false;
              }

              // Start dynamic thinking messages if not already active
              if (!isFunctionCallActive && input.onThinking) {
                isFunctionCallActive = true;
                chatUtils.thinkingMessageManager.start(formattedFunctionName, input.onThinking);
              }
            } else if (jsonObject.function) {
              // If function field exists, use it directly
              const formattedFunctionName = chatUtils.formatFunctionNameForDisplay(
                jsonObject.function,
              );

              // Stop general thinking and start function-specific thinking
              if (isGeneralThinkingActive) {
                chatUtils.generalThinkingMessageManager.stop();
                isGeneralThinkingActive = false;
              }

              // Start dynamic thinking messages if not already active
              if (!isFunctionCallActive && input.onThinking) {
                isFunctionCallActive = true;
                chatUtils.thinkingMessageManager.start(formattedFunctionName, input.onThinking);
              }
            } else {
              // Try to extract function name from debug title if not found in debug content
              const debugTitle = jsonObject.title || '';
              const functionNameFromTitle = chatUtils.extractFunctionNameFromDebug(debugTitle);

              if (functionNameFromTitle) {
                const formattedFunctionName =
                  chatUtils.formatFunctionNameForDisplay(functionNameFromTitle);

                // Stop general thinking and start function-specific thinking
                if (isGeneralThinkingActive) {
                  chatUtils.generalThinkingMessageManager.stop();
                  isGeneralThinkingActive = false;
                }

                // Start dynamic thinking messages if not already active
                if (!isFunctionCallActive && input.onThinking) {
                  isFunctionCallActive = true;
                  chatUtils.thinkingMessageManager.start(formattedFunctionName, input.onThinking);
                }
              } else {
                // If no function name found, continue with general thinking messages
                // Don't stop general thinking if it's already active
              }
            }
          }

          if (jsonObject.function_call) {
            // Handle function calls with dynamic thinking messages
            const functionName = jsonObject.function || jsonObject.function_call?.name || 'Unknown';

            const formattedFunctionName = chatUtils.formatFunctionNameForDisplay(functionName);

            // Stop general thinking and start function-specific thinking
            if (isGeneralThinkingActive) {
              chatUtils.generalThinkingMessageManager.stop();
              isGeneralThinkingActive = false;
            }

            // Start dynamic thinking messages if not already active
            if (!isFunctionCallActive && input.onThinking) {
              isFunctionCallActive = true;
              chatUtils.thinkingMessageManager.start(formattedFunctionName, input.onThinking);
            }
          }

          if (jsonObject.content && jsonObject.content !== '') {
            // Handle final content transition
            if (messageState === ('debug' as MessageState)) {
              handleMessageTransition('final');
              message = ''; // Start fresh for final content
            }

            // Stop all thinking messages when content starts arriving
            if (isFunctionCallActive) {
              chatUtils.thinkingMessageManager.stop();
              isFunctionCallActive = false;
            }

            if (isGeneralThinkingActive) {
              chatUtils.generalThinkingMessageManager.stop();
              isGeneralThinkingActive = false;
            }

            // Handle regular content - response shows immediately
            message += jsonObject.content;

            // INSTANT DISPLAY: Show response immediately
            input.onResponse(message);
          }
        }

        // Clear accumulated data after processing all JSON objects
        accumulatedData = '';
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
      if (isFunctionCallActive) {
        chatUtils.thinkingMessageManager.stop();
      }

      if (isGeneralThinkingActive) {
        chatUtils.generalThinkingMessageManager.stop();
      }

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
