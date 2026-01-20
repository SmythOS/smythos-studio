import { ChatAPIClient } from '@react/features/ai-chat/clients/chat-api.client';
import { MESSAGE_TYPES } from '@react/features/ai-chat/constants';
import type {
  IChatState,
  TAttachment,
  TChatError,
  TChatMessage,
  TChatStateConfig,
  TMetaMessage,
} from '@react/features/ai-chat/types';
import { forceScrollToBottomImmediate } from '@react/features/ai-chat/utils';
import { useCallback, useMemo, useRef, useState } from 'react';

export const useChatState = (options: TChatStateConfig): IChatState => {
  const { agentId, chatId, modelId, enableMetaMessages = false, inputRef } = options;

  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);
  const chatClient = useMemo(() => new ChatAPIClient(), []);

  const onStreamContent = useCallback((content: string): void => {
    if (!content) return;

    setMessages((prev) => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      const lastMessage = updated[lastIdx];

      if (!lastMessage) return prev;

      if (lastMessage.type === MESSAGE_TYPES.META) {
        updated[lastIdx] = {
          ...lastMessage,
          type: MESSAGE_TYPES.SYSTEM,
          content: content,
          metaMessages: undefined,
          updatedAt: Date.now(),
        };
        return updated;
      }

      if (lastMessage.type === MESSAGE_TYPES.LOADING) {
        updated[lastIdx] = {
          ...lastMessage,
          type: MESSAGE_TYPES.SYSTEM,
          content: content,
          updatedAt: Date.now(),
        };
        return updated;
      }

      if (lastMessage.type === MESSAGE_TYPES.SYSTEM) {
        const currentContent = typeof lastMessage.content === 'string' ? lastMessage.content : '';
        updated[lastIdx] = {
          ...lastMessage,
          content: currentContent + content,
          updatedAt: Date.now(),
        };
        return updated;
      }

      const newMessage: TChatMessage = {
        id: Date.now() + Math.random(),
        type: MESSAGE_TYPES.SYSTEM,
        content: content,
        updatedAt: Date.now(),
      };

      return [...updated, newMessage];
    });
  }, []);

  const onMetaMessage = useCallback(
    (meta: TMetaMessage): void => {
      if (!enableMetaMessages) return;

      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        const lastMessage = updated[lastIdx];

        if (!lastMessage) return prev;

        // Helper function to find matching META message index
        const findMatchingMetaIndex = (): number => {
          const reverseIdx = updated
            .slice()
            .reverse()
            .findIndex((msg) => {
              if (msg.type !== MESSAGE_TYPES.META) return false;

              const msgHashId = msg.metaMessages?.hashId;
              const newHashId = meta.hashId;
              if (msgHashId && newHashId) return msgHashId === newHashId;

              const msgTitle = msg.metaMessages?.title || '';
              const newTitle = meta.title || '';
              return msgTitle === newTitle;
            });

          return reverseIdx !== -1 ? updated.length - 1 - reverseIdx : -1;
        };

        // If debugOn is false, remove ALL META messages from the array
        if (meta.debugOn === false) {
          const filteredMessages = updated.filter((msg) => msg.type !== MESSAGE_TYPES.META);

          // Only return filtered if we actually removed something
          if (filteredMessages.length !== updated.length) {
            return filteredMessages;
          }

          return prev;
        }

        const debugText = meta.debug?.trim() || '';

        // Convert LOADING to META
        if (lastMessage.type === MESSAGE_TYPES.LOADING) {
          updated[lastIdx] = {
            ...lastMessage,
            type: MESSAGE_TYPES.META,
            content: debugText,
            metaMessages: meta,
            updatedAt: Date.now(),
          };
          return updated;
        }

        // Find existing META message by hashId or title
        const matchIdx = findMatchingMetaIndex();

        // Update existing META message
        if (matchIdx !== -1) {
          const target = updated[matchIdx];

          const currentContent = Array.isArray(target.content)
            ? target.content
            : [target.content].filter(Boolean);

          const updatedContent = debugText
            ? [...currentContent, debugText].join('\n\n')
            : currentContent.join('\n\n');

          updated[matchIdx] = {
            ...target,
            content: updatedContent,
            metaMessages: {
              ...target.metaMessages,
              ...meta,
            },
            updatedAt: Date.now(),
          };
          return updated;
        }

        // Create new META message
        const newMessage: TChatMessage = {
          id: Date.now() + Math.random(),
          type: MESSAGE_TYPES.META,
          content: debugText,
          metaMessages: meta,
          updatedAt: Date.now(),
        };

        return [...updated, newMessage];
      });
    },
    [enableMetaMessages],
  );

  const onStreamError = useCallback((error: TChatError): void => {
    if (error.isAborted) {
      setIsStreaming(false);
      return;
    }

    setMessages((prev) => {
      const filtered = prev.filter((msg) => msg.type !== MESSAGE_TYPES.LOADING);
      const errorMessage: TChatMessage = {
        id: Date.now() + Math.random(),
        type: MESSAGE_TYPES.ERROR,
        content: error.message || 'An error occurred',
        updatedAt: Date.now(),
      };
      return [...filtered, errorMessage];
    });

    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (
      message: string,
      currentAttachments: TAttachment[] = [],
      shouldSetUserMessage = true,
    ): Promise<void> => {
      if (isStreaming) return;

      try {
        setIsStreaming(true);
        abortRef.current = new AbortController();
        const now = Date.now();

        setMessages((prev) => {
          const msgCount = prev.length;

          const userMessage: TChatMessage | null = shouldSetUserMessage
            ? {
                id: msgCount + 1,
                type: MESSAGE_TYPES.USER,
                content: message?.trim() || '',
                attachments:
                  currentAttachments.length > 0
                    ? currentAttachments.map((a) => ({
                        id: a.id,
                        name: a.name,
                        type: a.type,
                        size: a.size,
                        url: a.url,
                        blobUrl: a.blobUrl,
                        file: a.file,
                      }))
                    : undefined,
                updatedAt: now,
              }
            : null;

          const loadingMessage: TChatMessage = {
            id: shouldSetUserMessage ? msgCount + 2 : msgCount + 1,
            type: MESSAGE_TYPES.LOADING,
            content: '',
            updatedAt: now,
          };

          if (shouldSetUserMessage && userMessage) {
            return [...prev, userMessage, loadingMessage];
          }
          return [...prev, loadingMessage];
        });

        await chatClient.streamChat(
          {
            message: message || '',
            attachments:
              currentAttachments.length > 0
                ? currentAttachments
                    .filter((a) => a.file)
                    .map((a) => ({
                      id: `${Date.now()}_${Math.random()}`,
                      file: a.file as File,
                      name: a.name,
                      type: a.type,
                      size: a.size,
                      url: a.url || '',
                      metadata: {},
                    }))
                : undefined,
            agentId,
            chatId,
            modelId,
            signal: abortRef.current.signal,
          },
          {
            onContent: onStreamContent,
            onMetaMessages: onMetaMessage,
            onError: onStreamError,
            onComplete: () => {
              setIsStreaming(false);
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.type === MESSAGE_TYPES.LOADING) {
                  return prev.slice(0, -1);
                }
                return prev;
              });

              // Auto-focus input after streaming completes
              inputRef?.current?.focus();
            },
          },
        );
      } catch (error) {
        console.error('Error in sendMessage:', error); // eslint-disable-line no-console
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [
      isStreaming,
      chatClient,
      agentId,
      chatId,
      modelId,
      onStreamContent,
      onMetaMessage,
      onStreamError,
      inputRef,
    ],
  );

  const stopStreaming = useCallback((): void => {
    if (abortRef.current) abortRef.current.abort();

    setIsStreaming(false);

    setMessages((prev) => {
      // Filter out LOADING and META messages when stopping stream
      const filtered = prev.filter(
        (msg) => msg.type !== MESSAGE_TYPES.LOADING && msg.type !== MESSAGE_TYPES.META,
      );

      const errorMessage: TChatMessage = {
        id: Date.now() + Math.random(),
        type: MESSAGE_TYPES.ERROR,
        content: 'Generation interrupted by user',
        updatedAt: Date.now(),
      };

      return [...filtered, errorMessage];
    });

    // Scroll to bottom to show error message
    setTimeout(() => {
      forceScrollToBottomImmediate({ behavior: 'smooth', delay: 0 });
    }, 100);

    // Auto-focus input after stopping stream
    inputRef?.current?.focus();
  }, [inputRef]);

  const retryLastMessage = useCallback(() => {
    const lastUserMessage = messages.filter((msg) => msg.type === MESSAGE_TYPES.USER).pop();

    if (lastUserMessage) {
      // Find the index of the last user message
      const lastUserMessageIndex = messages.findIndex((msg) => msg.id === lastUserMessage.id);

      // Remove the user message and all messages after it (system response, error, meta, etc.)
      setMessages((prev) => prev.slice(0, lastUserMessageIndex));

      const content = typeof lastUserMessage.content === 'string' ? lastUserMessage.content : '';
      sendMessage(content, lastUserMessage.attachments || [], true);
    }
  }, [messages, sendMessage]);

  return {
    messages,
    setMessages,
    isStreaming,
    sendMessage,
    stopStreaming,
    retryLastMessage,
  };
};
