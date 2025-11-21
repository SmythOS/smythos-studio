/* eslint-disable no-unused-vars */

/**
 * Professional React hook for complete chat state management
 * Combines streaming, message history, file uploads, and error handling
 */

import {
  IChatMessage,
  IMessageFile,
  IMetaMessages,
  IUseChatReturn,
} from '@react/features/ai-chat/types/chat.types';
import { useCallback, useRef, useState } from 'react';
import { USER_STOPPED_MESSAGE } from '../constants';
import { useChatStream } from './use-chat-stream';

/**
 * Hook configuration interface
 */
interface IUseChatConfig {
  agentId: string;
  chatId: string; // Chat/Conversation ID
  modelId?: string; // Model ID to override backend model selection
  headers?: Record<string, string>; // Custom headers for requests
  onChatComplete?: (message: string) => void; // Called when chat completes successfully
  onError?: (error: Error) => void; // Called when error occurs
}

/**
 * Main chat hook for complete state management
 * Provides all functionality needed for a chat interface
 *
 * @param config - Hook configuration
 * @returns Complete chat state and actions
 *
 * @example
 * ```typescript
 * const {
 *   messages,
 *   isGenerating,
 *   sendMessage,
 *   retryLastMessage,
 *   stopGenerating,
 *   clearMessages,
 * } = useChat({
 *   agentId: 'agent-123',
 *   chatId: 'chat-456',
 *   avatar: '/avatar.png',
 * });
 *
 * // Send a message
 * await sendMessage('Hello, AI!');
 *
 * // Send with files
 * await sendMessage('Analyze these files', [file1, file2]);
 *
 * // Retry last message
 * await retryLastMessage();
 *
 * // Stop generation
 * stopGenerating();
 * ```
 */
export const useChat = (config: IUseChatConfig): IUseChatReturn => {
  const { agentId, chatId, modelId, headers, onChatComplete, onError } = config;

  // State management
  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const lastUserMessageRef = useRef<{ message: string; files?: IMessageFile[] } | null>(null);

  // Current AI message being constructed
  const currentAIMessageRef = useRef<string>('');

  // Track if we're in thinking state to create new message after
  const isThinkingRef = useRef<boolean>(false);

  // Track current conversation turn ID for grouping messages
  const currentTurnIdRef = useRef<string | null>(null);

  // Throttling ref for batched updates
  const updateThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<{ content: string; turnId?: string } | null>(null);

  // Stream management
  const { isStreaming, error, startStream, abortStream, clearError } = useChatStream({
    onStreamStart: () => {
      currentAIMessageRef.current = '';
      isThinkingRef.current = false;
    },
    onStreamEnd: () => setIsProcessing(false),
  });

  /**
   * Adds a user message to the chat
   */
  const addUserMessage = useCallback((message: string, files?: IMessageFile[]) => {
    const userMessage: IChatMessage = {
      id: Date.now(),
      message,
      type: 'user', // Type determines user vs system - no me property needed!
      timestamp: Date.now(),
      files: files || [],
    };

    setMessages((prev) => [...prev, userMessage]);
  }, []);

  /**
   * Add or update AI message (similar to addMetaMessage pattern)
   * If last message is 'loading' or 'system', updates it; otherwise adds new message
   * @param content - Message content (empty string for new loading message)
   * @param turnId - Optional conversation turn ID
   */
  const handleAIMessage = useCallback((content: string = '', turnId?: string) => {
    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];

      // If last message is loading or system type, update it instead of adding new
      if (lastMessage && (lastMessage.type === 'system' || lastMessage.type === 'loading')) {
        // Optimized: Create new array only with modified last element
        // This avoids copying the entire array for long conversations
        const newMessages = prev.slice(0, -1);
        newMessages.push({
          ...lastMessage,
          message: content,
          conversationTurnId: turnId || lastMessage.conversationTurnId,
          type: content ? 'system' : 'loading',
        });
        return newMessages;
      }

      // Otherwise, add new AI message
      const aiMessage: IChatMessage = {
        id: Date.now() + 1,
        message: content,
        type: content ? 'system' : 'loading',
        timestamp: Date.now(),
        conversationTurnId: turnId || currentTurnIdRef.current || undefined,
      };

      return [...prev, aiMessage];
    });
  }, []);

  /**
   * Throttled update for message content during streaming
   * Batches multiple chunk updates to reduce re-renders
   * @param content - Accumulated content
   * @param turnId - Optional conversation turn ID
   */
  const updateStreamingMessage = useCallback((content: string, turnId?: string) => {
    // Store pending update
    pendingUpdateRef.current = { content, turnId };

    // Clear existing throttle
    if (updateThrottleRef.current) {
      clearTimeout(updateThrottleRef.current);
    }

    // Schedule batched update
    updateThrottleRef.current = setTimeout(() => {
      if (pendingUpdateRef.current) {
        const { content: pendingContent, turnId: pendingTurnId } = pendingUpdateRef.current;

        setMessages((prev) => {
          const lastMessageIndex = prev.length - 1;

          if (lastMessageIndex >= 0) {
            const lastMsg = prev[lastMessageIndex];
            const needsUpdate =
              lastMsg.type === 'system' ||
              lastMsg.type === 'loading' ||
              (pendingTurnId && !lastMsg.conversationTurnId);

            if (needsUpdate) {
              // Optimized: Only update last element
              const newMessages = prev.slice(0, -1);
              newMessages.push({
                ...lastMsg,
                message: pendingContent,
                conversationTurnId: pendingTurnId || lastMsg.conversationTurnId,
                type: 'system',
              });
              return newMessages;
            }
          }

          return prev;
        });

        pendingUpdateRef.current = null;
      }
      updateThrottleRef.current = null;
    }, 16); // 16ms throttle (60fps) - ultra-smooth, matches scroll rate
  }, []);

  /**
   * Add and update meta messages for current AI response
   */
  const addMetaMessage = useCallback((metaMessages: IMetaMessages) => {
    if (!metaMessages || !metaMessages.title) return;

    setMessages((prev) => {
      const lastMessage = prev[prev.length - 1];

      // If last message is loading or thinking type, update it instead of adding new
      if (lastMessage?.type === 'loading' || lastMessage?.type === 'thinking') {
        return prev.map((msg, index) =>
          index === prev.length - 1
            ? {
                ...msg,
                type: 'thinking',
                message: metaMessages.title,
                metaMessages, // Store full metaMessages object for component
                timestamp: Date.now(),
              }
            : msg,
        );
      }

      // Otherwise, add new loading message
      const metaMessage: IChatMessage = {
        id: Date.now() + 2,
        type: 'thinking',
        message: metaMessages.title,
        timestamp: Date.now(),
        metaMessages, // Store full metaMessages object for component
        conversationTurnId: currentTurnIdRef.current || undefined,
      };

      return [...prev, metaMessage];
    });
  }, []);

  /**
   * Sends a message to the AI
   * Accepts either raw File[] or FileWithMetadata[] (already uploaded)
   */
  const sendMessage = useCallback(
    async (message: string, files?: IMessageFile[]): Promise<void> => {
      // Validate input
      if (!message.trim() && (!files || files.length === 0)) return;

      // Store for retry
      lastUserMessageRef.current = { message, files };

      try {
        setIsProcessing(true);

        // Add user message to UI
        addUserMessage(message, files);

        // Add empty AI message for streaming
        handleAIMessage();

        // Start streaming
        await startStream(
          {
            agentId,
            chatId,
            message,
            modelId, // Pass model ID to override backend model selection
            attachments: files ?? [],
            signal: new AbortController().signal, // Signal managed by useChatStream
            headers,
          },
          {
            onStart: () => {
              currentTurnIdRef.current = null; // Reset turn ID for new conversation turn
            },
            onContent: (content: string, turnId?: string) => {
              // Capture turn ID only once
              if (turnId && !currentTurnIdRef.current) {
                currentTurnIdRef.current = turnId;
              }

              // If content comes after thinking, replace thinking message with loading message
              if (isThinkingRef.current) {
                setMessages((prev) => {
                  const lastMessageIndex = prev.length - 1;
                  if (lastMessageIndex >= 0 && prev[lastMessageIndex].type === 'thinking') {
                    // Replace thinking message with loading message
                    const newMessages = prev.slice(0, -1);
                    newMessages.push({
                      ...prev[lastMessageIndex],
                      type: 'loading',
                      message: '',
                      conversationTurnId: turnId || prev[lastMessageIndex].conversationTurnId,
                    });
                    return newMessages;
                  }
                  return prev;
                });
                isThinkingRef.current = false; // Mark that we've handled the thinking transition
                currentAIMessageRef.current = ''; // Reset accumulator for new message
              }

              // Accumulate content
              currentAIMessageRef.current += content;

              // Use throttled update for better performance during streaming
              // This batches rapid chunk updates to reduce re-renders
              updateStreamingMessage(currentAIMessageRef.current, turnId);
            },
            onMetaMessages: (metaMessages: IMetaMessages, turnId?: string) => {
              if (turnId && !currentTurnIdRef.current) {
                currentTurnIdRef.current = turnId; // Capture turn ID from thinking messages
              }

              // Mark that we're in thinking state
              isThinkingRef.current = true;

              addMetaMessage(metaMessages);
            },

            onError: (streamError) => {
              // Handle stream errors
              if (streamError.isAborted) {
                // 🎯 User stopped generation
                const currentContent = currentAIMessageRef.current;

                // Step 1: Finalize the AI message (loading → system)
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMessageIndex = updated.length - 1;

                  if (lastMessageIndex >= 0) {
                    const lastMsg = updated[lastMessageIndex];
                    if (lastMsg.type === 'loading' || lastMsg.type === 'system') {
                      updated[lastMessageIndex] = {
                        ...lastMsg,
                        message: currentContent || lastMsg.message,
                        type: 'system',
                      };
                    }
                  }

                  // Step 2: Add separate error message
                  const stopMessage: IChatMessage = {
                    id: Date.now() + 2,
                    message: USER_STOPPED_MESSAGE,
                    type: 'error', // Show as error/warning style but not an actual error
                    timestamp: Date.now(),
                  };

                  updated.push(stopMessage);

                  return updated;
                });
              } else {
                // Real error - show error message
                handleAIMessage(streamError.message);
              }

              // Reset state
              currentAIMessageRef.current = '';
              currentTurnIdRef.current = null;

              if (onError) onError(new Error(streamError.message));
            },
            onComplete: () => {
              // Clear throttle and flush pending updates immediately
              if (updateThrottleRef.current) {
                clearTimeout(updateThrottleRef.current);
                updateThrottleRef.current = null;
              }

              // Finalize message with accumulated content
              const finalMessage = currentAIMessageRef.current;
              handleAIMessage(finalMessage); // immediate update

              // Reset state
              currentAIMessageRef.current = '';
              currentTurnIdRef.current = null;
              pendingUpdateRef.current = null;

              if (onChatComplete) onChatComplete(finalMessage);
            },
          },
        );
      } catch (sendError) {
        const errorMessage =
          sendError instanceof Error ? sendError.message : 'Failed to send message';

        if (onError) onError(sendError instanceof Error ? sendError : new Error(errorMessage));
      } finally {
        setIsProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      agentId,
      chatId,
      headers,
      addUserMessage,
      handleAIMessage,
      addMetaMessage,
      updateStreamingMessage,
      startStream,
      clearError,
      onChatComplete,
      onError,
    ],
  );

  /**
   * Retries the last sent message
   */
  const retryLastMessage = useCallback(async (): Promise<void> => {
    if (!lastUserMessageRef.current) return;

    const { message, files } = lastUserMessageRef.current;

    // Smart removal: check last message type
    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];

      // If last message is error (user stopped), remove 3 messages: user + AI + error
      // Otherwise remove 2 messages: user + failed AI response
      const messagesToRemove = lastMsg && lastMsg.type === 'error' ? 3 : 2;

      return prev.slice(0, -messagesToRemove);
    });

    // Resend the message
    await sendMessage(message, files);
  }, [sendMessage]);

  /**
   * Stops the current generation
   * The error handler will preserve generated content and append USER_STOPPED_MESSAGE
   */
  const stopGenerating = useCallback(() => {
    // Step 1: Clear throttle timeout
    if (updateThrottleRef.current) {
      clearTimeout(updateThrottleRef.current);
      updateThrottleRef.current = null;
    }

    // Step 2: Flush any pending updates before aborting
    if (pendingUpdateRef.current) {
      const { content: pendingContent } = pendingUpdateRef.current;
      currentAIMessageRef.current = pendingContent; // Save pending content
      pendingUpdateRef.current = null;
    }

    // Step 3: Abort the stream (onError will handle the rest)
    abortStream();
  }, [abortStream]);

  /**
   * Clears all messages and resets state
   */
  const clearMessages = useCallback(() => {
    // Clear throttle timeout
    if (updateThrottleRef.current) {
      clearTimeout(updateThrottleRef.current);
      updateThrottleRef.current = null;
    }

    // Clear pending updates
    pendingUpdateRef.current = null;

    // Clear messages and refs
    setMessages([]);
    lastUserMessageRef.current = null;
    currentAIMessageRef.current = '';
    currentTurnIdRef.current = null;
  }, []);

  /**
   * Clears error state
   */
  const clearErrorState = useCallback(() => {
    clearError();
  }, [clearError]);

  return {
    // State
    messages,
    isGenerating: isStreaming,
    isProcessing,
    error,

    // Actions
    sendMessage,
    retryLastMessage,
    stopGenerating,
    clearMessages,
    clearError: clearErrorState,
  };
};
