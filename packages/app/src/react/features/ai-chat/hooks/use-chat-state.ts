import { ChatAPIClient } from '@react/features/ai-chat/clients/chat-api.client';
import { MESSAGE_TYPES } from '@react/features/ai-chat/constants';
import type {
  IAttachment,
  IChatError,
  IChatState,
  IConfigOptions,
  IMessage,
  IMetaMessages,
} from '@react/features/ai-chat/types/chat';
import { useCallback, useMemo, useRef, useState } from 'react';

export const useChatState = (options: IConfigOptions): IChatState => {
  const { agentId, chatId, modelId, enableMetaMessages = false, inputRef } = options;

  const [messages, setMessages] = useState<IMessage[]>([]);
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

      const newMessage: IMessage = {
        id: Date.now() + Math.random(),
        type: MESSAGE_TYPES.SYSTEM,
        content: content,
        updatedAt: Date.now(),
      };

      return [...updated, newMessage];
    });
  }, []);

  const onMetaMessage = useCallback(
    (meta: IMetaMessages): void => {
      if (!enableMetaMessages) return;

      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        const lastMessage = updated[lastIdx];

        if (!lastMessage) return prev;

        const debugText = meta.debug?.trim() || '';

        // Convert LOADING to DEBUG
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

        // Find existing DEBUG message by hashId or title
        const matchIdx = updated
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

        // Update existing DEBUG message
        if (matchIdx !== -1) {
          const realIndex = updated.length - 1 - matchIdx;
          const target = updated[realIndex];

          const currentContent = Array.isArray(target.content)
            ? target.content
            : [target.content].filter(Boolean);

          const updatedContent = debugText
            ? [...currentContent, debugText].join('\n\n')
            : currentContent.join('\n\n');

          updated[realIndex] = {
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

        // Create new DEBUG message
        const newMessage: IMessage = {
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

  const onStreamError = useCallback((error: IChatError): void => {
    if (error.isAborted) {
      setIsStreaming(false);
      return;
    }

    setMessages((prev) => {
      const filtered = prev.filter((msg) => msg.type !== MESSAGE_TYPES.LOADING);
      const errorMessage: IMessage = {
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
      currentAttachments: IAttachment[] = [],
      shouldSetUserMessage = true,
    ): Promise<void> => {
      if (isStreaming) return;

      try {
        setIsStreaming(true);
        abortRef.current = new AbortController();
        const now = Date.now();

        setMessages((prev) => {
          const msgCount = prev.length;

          const userMessage: IMessage | null = shouldSetUserMessage
            ? {
                id: msgCount + 1,
                type: MESSAGE_TYPES.USER,
                content: message?.trim() || '',
                attachments:
                  currentAttachments.length > 0
                    ? currentAttachments.map((a) => ({
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

          const loadingMessage: IMessage = {
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
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setIsStreaming(false);

    setMessages((prev) => {
      const filtered = prev.filter((msg) => msg.type !== MESSAGE_TYPES.LOADING);

      const updated = filtered.map((msg) => {
        if (msg.metaMessages?.debugOn === true) {
          return {
            ...msg,
            metaMessages: { ...msg.metaMessages, debugOn: false },
          };
        }
        return msg;
      });

      const errorMessage: IMessage = {
        id: Date.now() + Math.random(),
        type: MESSAGE_TYPES.ERROR,
        content: 'Generation interrupted by user',
        updatedAt: Date.now(),
      };

      return [...updated, errorMessage];
    });

    // Auto-focus input after stopping stream
    inputRef?.current?.focus();
  }, [inputRef]);

  const retryLastMessage = useCallback(() => {
    const lastUserMessage = messages.filter((msg) => msg.type === MESSAGE_TYPES.USER).pop();

    if (lastUserMessage) {
      setMessages((prev) =>
        prev.filter((msg) => msg.type !== MESSAGE_TYPES.ERROR && msg.id !== lastUserMessage.id),
      );

      const content = typeof lastUserMessage.content === 'string' ? lastUserMessage.content : '';
      sendMessage(content, lastUserMessage.attachments || [], true);
    }
  }, [messages, sendMessage]);

  return {
    messages,
    setMessages,
    isStreaming,
    setIsStreaming,
    sendMessage,
    stopStreaming,
    retryLastMessage,
  };
};
