import { useCallback, useRef, useState } from 'react';

import { CHAT_ERROR_MESSAGE } from '@react/features/ai-chat/constants';
import { chatUtils } from '@react/features/ai-chat/utils';
import { FileWithMetadata, IChatMessage } from '@react/shared/types/chat.types';

interface UseChatActionsProps {
  agentId: string;
  chatId: string;
  avatar?: string;
  onChatComplete?: () => void;
}

interface UseChatActionsReturn {
  chatHistoryMessages: IChatMessage[];
  isGenerating: boolean;
  isQueryInputProcessing: boolean;
  isRetrying: boolean;
  sendMessage: (message: string, attachedFiles?: FileWithMetadata[]) => Promise<void>; // eslint-disable-line no-unused-vars, max-len
  retryLastMessage: () => void;
  stopGenerating: () => void;
  clearMessages: () => void;
}

// Interface to store last user message with files
interface LastUserMessage {
  message: string;
  attachedFiles?: FileWithMetadata[];
}

export const useChatActions = ({
  agentId,
  chatId,
  avatar,
  onChatComplete,
}: UseChatActionsProps): UseChatActionsReturn => {
  const [chatHistoryMessages, setChatHistoryMessages] = useState<IChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isQueryInputProcessing, setIsQueryInputProcessing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Store both message and attached files for retry functionality
  const lastUserMessageRef = useRef<LastUserMessage>({ message: '', attachedFiles: [] });
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearMessages = useCallback(() => {
    setChatHistoryMessages([]);
    lastUserMessageRef.current = { message: '', attachedFiles: [] };
  }, []);

  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setIsQueryInputProcessing(false);
  }, []);

  const sendMessage = useCallback(
    async (message: string, attachedFiles?: FileWithMetadata[]) => {
      if (!message.trim() && (!attachedFiles || attachedFiles.length === 0)) return;

      // Store the complete message with files for retry functionality
      lastUserMessageRef.current = {
        message,
        attachedFiles: attachedFiles || [],
      };

      // Add user message to chat history
      if (message.trim()) {
        setChatHistoryMessages((prev) => {
          const newMessage: IChatMessage = {
            me: true,
            message: message.replace(/\n/g, '\n'),
            type: 'user',
            files: attachedFiles,
          };
          return [...prev, newMessage];
        });
      } else if (attachedFiles?.length) {
        setChatHistoryMessages((prev) => {
          const newMessage: IChatMessage = {
            me: true,
            message: '',
            type: 'user',
            files: attachedFiles,
            hideMessageBubble: true,
          };
          return [...prev, newMessage];
        });
      }

      // Add initial AI response message
      const replyMessage: IChatMessage = {
        me: false,
        message: '',
        type: 'system',
        avatar,
        isReplying: true,
      };

      setChatHistoryMessages((prev) => [...prev, replyMessage]);

      try {
        setIsQueryInputProcessing(true);
        setIsGenerating(true);

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        await chatUtils.generateResponse({
          agentId,
          query: message,
          fileKeys: attachedFiles?.map((f) => f.metadata.key).filter(Boolean) as string[],
          chatId,
          signal,
          onResponse: (value: string, errorInfo?: { isError?: boolean; errorType?: string }) => {
            setChatHistoryMessages((bubbles) => {
              // Only remove thinking messages and clean message when we have actual content
              // This ensures debug messages are preserved until content starts arriving
              if (value && value.trim() !== '') {
                const filteredBubbles = bubbles.filter((msg) => msg.type !== 'thinking');

                // Find the last system message
                const lastSystemMessageIndex =
                  filteredBubbles
                    .map((msg, index) => ({ msg, index }))
                    .filter(({ msg }) => msg.type === 'system')
                    .pop()?.index ?? -1;

                if (lastSystemMessageIndex !== -1) {
                  // Update the system message with final response and error info
                  const updatedBubbles = [...filteredBubbles];
                  updatedBubbles[lastSystemMessageIndex].message = value;
                  updatedBubbles[lastSystemMessageIndex].isReplying = false;
                  updatedBubbles[lastSystemMessageIndex].isError = errorInfo?.isError || false;
                  updatedBubbles[lastSystemMessageIndex].hideMessageBubble = false; // Show the message bubble
                  return updatedBubbles;
                }
                return filteredBubbles;
              } else {
                // Keep thinking messages if no content yet
                return bubbles;
              }
            });
          },
          onThinking: (thinking) => {
            setChatHistoryMessages((bubbles) => {
              // Find the last system message index
              const lastSystemIndex =
                bubbles
                  .map((msg, index) => ({ msg, index }))
                  .filter(({ msg }) => msg.type === 'system')
                  .pop()?.index ?? -1;

              // Check if there's already a thinking message after the last system message
              const thinkingAfterSystem = bubbles
                .slice(lastSystemIndex + 1)
                .find((msg) => msg.type === 'thinking');

              if (thinkingAfterSystem) {
                // Update existing thinking message
                thinkingAfterSystem.message = thinking.message;
                return [...bubbles];
              } else {
                // Add new thinking message after the last system message
                const thinkingMessage: IChatMessage = {
                  me: false,
                  message: thinking.message,
                  type: 'thinking',
                  avatar,
                  isReplying: false, // Hide loading indicator for thinking messages
                };

                const newBubbles = [...bubbles];
                if (lastSystemIndex !== -1) {
                  // Insert after the last system message
                  newBubbles.splice(lastSystemIndex + 1, 0, thinkingMessage);

                  // Hide the system message when thinking starts
                  // newBubbles[lastSystemIndex].hideMessageBubble = true;

                  // Don't hide the system message when thinking starts - keep it visible during debug
                  // The message will only be hidden when actual content starts arriving
                  newBubbles[lastSystemIndex].isReplying = false;
                } else {
                  // Add at the end if no system message
                  newBubbles.push(thinkingMessage);
                }

                return newBubbles;
              }
            });
          },
          onStart: () => {
            setChatHistoryMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.type === 'system') {
                // Show initial processing message and loading indicator
                lastMessage.message = 'Processing your request...';
                lastMessage.isReplying = true; // Show loading indicator for system message
              }
              return newMessages;
            });
          },
          onEnd: () => {
            setChatHistoryMessages((prev) => {
              // Remove thinking messages when response is complete
              const filteredMessages = prev.filter((msg) => msg.type !== 'thinking');
              const newMessages = [...filteredMessages];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage) {
                lastMessage.isReplying = false;
              }
              return newMessages;
            });
            setIsRetrying(false);
            setIsGenerating(false);
            onChatComplete?.();
            abortControllerRef.current = null;
          },
        });
      } catch (error) {
        if (error.name === 'AbortError') {
          setChatHistoryMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage) {
              lastMessage.isReplying = false;
              lastMessage.message += '';
            }
            return newMessages;
          });
        } else {
          setChatHistoryMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage) {
              lastMessage.isReplying = false;
              lastMessage.message = CHAT_ERROR_MESSAGE;
              lastMessage.isError = true;
            }
            return newMessages;
          });
        }
      } finally {
        setIsQueryInputProcessing(false);
        setIsRetrying(false);
        setIsGenerating(false);
      }
    },
    [agentId, chatId, avatar, onChatComplete],
  );

  const retryLastMessage = useCallback(() => {
    const lastMessage = lastUserMessageRef.current;
    if (
      lastMessage.message ||
      (lastMessage.attachedFiles && lastMessage.attachedFiles.length > 0)
    ) {
      setIsRetrying(true);

      // Remove the last error message and replace it with a new AI response message
      setChatHistoryMessages((prev) => {
        const newMessages = [...prev];
        const lastMessageIndex = newMessages.length - 1;

        if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].isError) {
          // Replace the error message with a new AI response message
          newMessages[lastMessageIndex] = {
            me: false,
            message: '',
            type: 'system',
            avatar,
            isReplying: true,
            isError: false,
          };
        }

        return newMessages;
      });

      // Retry the API call without adding a new user message
      const retryApiCall = async () => {
        try {
          setIsQueryInputProcessing(true);
          setIsGenerating(true);

          abortControllerRef.current = new AbortController();
          const signal = abortControllerRef.current.signal;

          await chatUtils.generateResponse({
            agentId,
            query: lastMessage.message,
            fileKeys: lastMessage.attachedFiles
              ?.map((f) => f.metadata.key)
              .filter(Boolean) as string[],
            chatId,
            signal,
            onResponse: (value: string, errorInfo?: { isError?: boolean; errorType?: string }) => {
              setChatHistoryMessages((bubbles) => {
                // Only remove thinking messages if we have actual content
                if (value && value.trim() !== '') {
                  const filteredBubbles = bubbles.filter((msg) => msg.type !== 'thinking');

                  // Find the last system message
                  const lastSystemMessageIndex =
                    filteredBubbles
                      .map((msg, index) => ({ msg, index }))
                      .filter(({ msg }) => msg.type === 'system')
                      .pop()?.index ?? -1;

                  if (lastSystemMessageIndex !== -1) {
                    // Update the system message with final response and error info
                    const updatedBubbles = [...filteredBubbles];
                    updatedBubbles[lastSystemMessageIndex].message = value;
                    updatedBubbles[lastSystemMessageIndex].isReplying = false;
                    updatedBubbles[lastSystemMessageIndex].isError = errorInfo?.isError || false;
                    updatedBubbles[lastSystemMessageIndex].hideMessageBubble = false;
                    return updatedBubbles;
                  }
                  return filteredBubbles;
                } else {
                  // Keep thinking messages if no content yet
                  return bubbles;
                }
              });
            },
            onThinking: (thinking) => {
              setChatHistoryMessages((bubbles) => {
                // Find the last system message index
                const lastSystemIndex =
                  bubbles
                    .map((msg, index) => ({ msg, index }))
                    .filter(({ msg }) => msg.type === 'system')
                    .pop()?.index ?? -1;

                // Check if there's already a thinking message after the last system message
                const thinkingAfterSystem = bubbles
                  .slice(lastSystemIndex + 1)
                  .find((msg) => msg.type === 'thinking');

                if (thinkingAfterSystem) {
                  // Update existing thinking message
                  thinkingAfterSystem.message = thinking.message;
                  return [...bubbles];
                } else {
                  // Add new thinking message after the last system message
                  const thinkingMessage: IChatMessage = {
                    me: false,
                    message: thinking.message,
                    type: 'thinking',
                    avatar,
                    isReplying: false,
                  };

                  const newBubbles = [...bubbles];
                  if (lastSystemIndex !== -1) {
                    // Insert after the last system message
                    newBubbles.splice(lastSystemIndex + 1, 0, thinkingMessage);
                    // Hide the system message when thinking starts
                    newBubbles[lastSystemIndex].hideMessageBubble = true;
                    newBubbles[lastSystemIndex].isReplying = false;
                  } else {
                    // Add at the end if no system message
                    newBubbles.push(thinkingMessage);
                  }

                  return newBubbles;
                }
              });
            },
            onStart: () => {
              setChatHistoryMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.type === 'system') {
                  lastMessage.isReplying = true;
                }
                return newMessages;
              });
            },
            onEnd: () => {
              setChatHistoryMessages((prev) => {
                // Remove thinking messages when response is complete
                const filteredMessages = prev.filter((msg) => msg.type !== 'thinking');
                const newMessages = [...filteredMessages];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage) {
                  lastMessage.isReplying = false;
                }
                return newMessages;
              });
              setIsRetrying(false);
              setIsGenerating(false);
              onChatComplete?.();
              abortControllerRef.current = null;
            },
          });
        } catch (error) {
          if (error.name === 'AbortError') {
            setChatHistoryMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage) {
                lastMessage.isReplying = false;
                lastMessage.message += '';
              }
              return newMessages;
            });
          } else {
            setChatHistoryMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage) {
                lastMessage.isReplying = false;
                lastMessage.message = CHAT_ERROR_MESSAGE;
                lastMessage.isError = true;
              }
              return newMessages;
            });
          }
        } finally {
          setIsQueryInputProcessing(false);
          setIsRetrying(false);
          setIsGenerating(false);
        }
      };

      retryApiCall();
    }
  }, [agentId, chatId, avatar, onChatComplete]);

  return {
    chatHistoryMessages,
    isGenerating,
    isQueryInputProcessing,
    isRetrying,
    sendMessage,
    retryLastMessage,
    stopGenerating,
    clearMessages,
  };
};
