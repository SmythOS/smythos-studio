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
  sendMessage: (message: string, attachedFiles?: FileWithMetadata[]) => Promise<void>;
  retryLastMessage: () => void;
  stopGenerating: () => void;
  clearMessages: () => void;
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

  const lastUserQueryRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearMessages = useCallback(() => {
    setChatHistoryMessages([]);
    lastUserQueryRef.current = '';
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

      lastUserQueryRef.current = message;

      // Add user message to chat history
      if (message.trim()) {
        setChatHistoryMessages((prev) => {
          const newMessage: IChatMessage = {
            me: true,
            message: message.replace(/\n/g, '\n'),
            files: attachedFiles,
          };
          return [...prev, newMessage];
        });
      } else if (attachedFiles?.length) {
        setChatHistoryMessages((prev) => {
          const newMessage: IChatMessage = {
            me: true,
            message: '',
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
          onResponse: (value: string) => {
            setChatHistoryMessages((bubbles) => {
              const lastMessage = bubbles[bubbles.length - 1];
              if (lastMessage) {
                lastMessage.message = value;
                lastMessage.isReplying = false;
                lastMessage.isError = false;
              }
              return [...bubbles];
            });
          },
          onStart: () => {
            setChatHistoryMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage) {
                lastMessage.isReplying = true;
              }
              return newMessages;
            });
          },
          onEnd: () => {
            setChatHistoryMessages((prev) => {
              const newMessages = [...prev];
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
    if (lastUserQueryRef.current) {
      setIsRetrying(true);
      sendMessage(lastUserQueryRef.current);
    }
  }, [sendMessage]);

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
