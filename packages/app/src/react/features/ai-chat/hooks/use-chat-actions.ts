import { useCallback, useRef, useState } from 'react';

import { CHAT_ERROR_MESSAGE } from '@react/features/ai-chat/constants';
import { IChatMessage, IMessageFile } from '@react/features/ai-chat/types/chat.types';
import { chatUtils } from '@react/features/ai-chat/utils';

interface UseChatActionsProps {
  agentId: string;
  chatId: string;
  avatar?: string;
  onChatComplete?: () => void;
}

interface UseChatActionsReturn {
  messagesHistory: IChatMessage[];
  isGenerating: boolean;
  isInputProcessing: boolean;
  isRetrying: boolean;
  sendMessage: (message: string, attachedFiles?: IMessageFile[]) => Promise<void>; // eslint-disable-line no-unused-vars
  retryLastMessage: () => void;
  stopGenerating: () => void;
  clearMessages: () => void;
}

// Interface to store last user message with files
interface LastUserMessage {
  message: string;
  attachedFiles?: IMessageFile[];
}

export const useChatActions = ({
  agentId,
  chatId,
  avatar,
  onChatComplete,
}: UseChatActionsProps): UseChatActionsReturn => {
  const [messagesHistory, setMessagesHistory] = useState<IChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInputProcessing, setIsInputProcessing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Store both message and attached files for retry functionality
  const lastUserMessageRef = useRef<LastUserMessage>({ message: '', attachedFiles: [] });
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearMessages = useCallback(() => {
    setMessagesHistory([]);
    lastUserMessageRef.current = { message: '', attachedFiles: [] };
  }, []);

  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setIsInputProcessing(false);
  }, []);

  const sendMessage = useCallback(
    async (message: string, attachedFiles?: IMessageFile[]) => {
      if (!message.trim() && (!attachedFiles || attachedFiles.length === 0)) return;

      // Store the complete message with files for retry functionality
      lastUserMessageRef.current = {
        message,
        attachedFiles: attachedFiles || [],
      };

      // Add user message to chat history
      if (message.trim()) {
        setMessagesHistory((prev) => {
          const newMessage: IChatMessage = {
            message: message.replace(/\n/g, '\n'),
            type: 'user', // Type determines user vs system
            files: attachedFiles,
          };
          return [...prev, newMessage];
        });
      } else if (attachedFiles?.length) {
        setMessagesHistory((prev) => {
          const newMessage: IChatMessage = {
            message: '', // Empty message - will auto-hide bubble
            type: 'user', // Type determines user vs system
            files: attachedFiles,
          };
          return [...prev, newMessage];
        });
      }

      // Add initial AI response message with loading state
      const replyMessage: IChatMessage = {
        message: '',
        type: 'loading', // ✅ Type determines loading state
        avatar,
      };

      setMessagesHistory((prev) => [...prev, replyMessage]);

      try {
        setIsInputProcessing(true);
        setIsGenerating(true);

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        await chatUtils.generateResponse({
          agentId,
          query: message,
          attachments: (attachedFiles || [])
            .map((f) => ({
              url: f.metadata.publicUrl,
              name: f.file?.name,
              type: f.metadata.fileType,
              size: f.file?.size,
            }))
            .filter((a) => !!a.url),
          chatId,
          signal,
          onResponse: (value: string, errorInfo?: { isError?: boolean; errorType?: string }) => {
            setMessagesHistory((bubbles) => {
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
                  updatedBubbles[lastSystemMessageIndex].type = errorInfo?.isError
                    ? 'error'
                    : 'system';
                  updatedBubbles[lastSystemMessageIndex].thinkingMessage = undefined; // Clear thinking message
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
            setMessagesHistory((bubbles) => {
              // Find the last system or loading message index
              const lastSystemIndex =
                bubbles
                  .map((msg, index) => ({ msg, index }))
                  .filter(({ msg }) => msg.type === 'system' || msg.type === 'loading')
                  .pop()?.index ?? -1;

              if (lastSystemIndex !== -1) {
                // Update the existing system message with thinking message instead of creating separate bubble
                const updatedBubbles = [...bubbles];
                updatedBubbles[lastSystemIndex].thinkingMessage = thinking.message;
                updatedBubbles[lastSystemIndex].type = 'system'; // Change from loading to system
                return updatedBubbles;
              }

              return bubbles;
            });
          },
          onStart: () => {
            setMessagesHistory((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (
                lastMessage &&
                (lastMessage.type === 'system' || lastMessage.type === 'loading')
              ) {
                // Show initial processing message and loading indicator
                lastMessage.message = '';
                lastMessage.type = 'loading'; // Show loading state
              }
              return newMessages;
            });
          },
          onEnd: () => {
            setMessagesHistory((prev) => {
              // Remove thinking messages when response is complete
              const filteredMessages = prev.filter((msg) => msg.type !== 'thinking');
              const newMessages = [...filteredMessages];

              // Clear thinkingMessage from all system messages
              newMessages.forEach((msg) => {
                if (msg.type === 'system') {
                  msg.thinkingMessage = undefined;
                }
              });

              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.type === 'loading') {
                lastMessage.type = 'system'; // Change from loading to system
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
          setMessagesHistory((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage) {
              lastMessage.type = 'system'; // Change from loading to system on abort
              lastMessage.message += '';
            }
            return newMessages;
          });
        } else {
          setMessagesHistory((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage) {
              lastMessage.type = 'error'; // Set error type
              lastMessage.message = CHAT_ERROR_MESSAGE;
            }
            return newMessages;
          });
        }
      } finally {
        setIsInputProcessing(false);
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
      // Remove the last error message and replace it with a new AI response message
      setMessagesHistory((prev) => {
        const newMessages = [...prev];
        const lastMessageIndex = newMessages.length - 1;

        if (lastMessageIndex >= 0 && newMessages[lastMessageIndex].type === 'error') {
          // Replace the error message with a new loading message
          newMessages[lastMessageIndex] = {
            message: '',
            type: 'loading', // Type determines loading state
            avatar,
          };
        }

        return newMessages;
      });

      // Retry the API call without adding a new user message
      const retryApiCall = async () => {
        try {
          setIsInputProcessing(true);
          setIsGenerating(true);

          abortControllerRef.current = new AbortController();
          const signal = abortControllerRef.current.signal;

          await chatUtils.generateResponse({
            agentId,
            query: lastMessage.message,
            attachments: (lastUserMessageRef.current.attachedFiles || [])
              .map((f) => ({
                url: f.metadata.publicUrl,
                name: f.file?.name,
                type: f.metadata.fileType,
                size: f.file?.size,
              }))
              .filter((a) => !!a.url),
            chatId,
            signal,
            onResponse: (value: string, errorInfo?: { isError?: boolean; errorType?: string }) => {
              setMessagesHistory((bubbles) => {
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
                    updatedBubbles[lastSystemMessageIndex].type = errorInfo?.isError
                      ? 'error'
                      : 'system';
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
              setMessagesHistory((bubbles) => {
                // Find the last system or loading message index
                const lastSystemIndex =
                  bubbles
                    .map((msg, index) => ({ msg, index }))
                    .filter(({ msg }) => msg.type === 'system' || msg.type === 'loading')
                    .pop()?.index ?? -1;

                if (lastSystemIndex !== -1) {
                  // Update the existing system message with thinking message
                  const updatedBubbles = [...bubbles];
                  updatedBubbles[lastSystemIndex].thinkingMessage = thinking.message;
                  updatedBubbles[lastSystemIndex].type = 'system'; // Change from loading to system
                  return updatedBubbles;
                }

                return bubbles;
              });
            },
            onStart: () => {
              setMessagesHistory((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (
                  lastMessage &&
                  (lastMessage.type === 'system' || lastMessage.type === 'loading')
                ) {
                  lastMessage.type = 'loading'; // Show loading state
                }
                return newMessages;
              });
            },
            onEnd: () => {
              setMessagesHistory((prev) => {
                // Remove thinking messages when response is complete
                const filteredMessages = prev.filter((msg) => msg.type !== 'thinking');
                const newMessages = [...filteredMessages];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.type === 'loading') {
                  lastMessage.type = 'system'; // Change from loading to system
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
            setMessagesHistory((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage) {
                lastMessage.type = 'system'; // Change from loading to system on abort
                lastMessage.message += '';
              }
              return newMessages;
            });
          } else {
            setMessagesHistory((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage) {
                lastMessage.type = 'error'; // Set error type
                lastMessage.message = error.error || error.message || CHAT_ERROR_MESSAGE;
              }
              return newMessages;
            });
          }
        } finally {
          setIsInputProcessing(false);
          setIsRetrying(false);
          setIsGenerating(false);
        }
      };

      retryApiCall();
      setIsRetrying(false);
    }
  }, [agentId, chatId, avatar, onChatComplete]);

  return {
    messagesHistory,
    isGenerating,
    isInputProcessing,
    isRetrying,
    sendMessage,
    retryLastMessage,
    stopGenerating,
    clearMessages,
  };
};
