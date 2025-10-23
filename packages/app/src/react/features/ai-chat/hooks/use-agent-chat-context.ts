/**
 * Custom hook for Agent Chat Context
 * Separates the chat context logic from the component for better architecture
 *
 * This hook encapsulates all chat-related state and actions, providing a clean
 * interface for the ChatProvider.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useAgentSettings,
  useCreateChatMutation,
  useFileUpload,
  useUpdateAgentSettingsMutation,
} from '@react/features/ai-chat/hooks';
import { useChat } from '@react/features/ai-chat/hooks/use-chat';
import { IChatMessage, IMessageFile } from '@react/features/ai-chat/types/chat.types';
import { useAgent } from '@react/shared/hooks/agent';
import { Observability } from '@shared/observability';
import { EVENTS } from '@shared/posthog/constants/events';

/**
 * Configuration options for useAgentChatContext hook
 */
export interface IUseAgentChatContextConfig {
  /** Agent ID for the chat session */
  agentId: string;
  /** Callback when chat is ready */
  onChatReady?: () => void;
  /** Callback when chat session is cleared */
  onChatCleared?: () => void;
}

/**
 * Return type for useAgentChatContext hook
 */
/* eslint-disable no-unused-vars */
export interface IUseAgentChatContextReturn {
  /** Chat context value ready to be passed to ChatProvider */
  chatContextValue: {
    // File handling
    files: IMessageFile[];
    uploadingFiles: Set<string>;
    isUploadInProgress: boolean;
    isMaxFilesUploaded: boolean;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFileDrop: (files: File[]) => Promise<void>;
    removeFile: (fileKey: number) => void;
    clearFiles: () => void;
    uploadError: { show: boolean; message: string };
    clearError: () => void;
    // Chat state
    isGenerating: boolean;
    isInputProcessing: boolean;
    isRetrying: boolean;
    messagesHistory: IChatMessage[];
    inputPlaceholder: string;
    inputDisabled: boolean;
    // Chat actions
    sendMessage: (message: string) => Promise<void>;
    retryLastMessage: () => void;
    stopGenerating: () => void;
    clearChatSession: () => Promise<void>;
  };
  /** Agent data */
  agent: ReturnType<typeof useAgent>['data'];
  /** Agent settings */
  agentSettings: ReturnType<typeof useAgentSettings>['data'];
  /** Loading states */
  isLoading: {
    agent: boolean;
    settings: boolean;
    chatCreating: boolean;
  };
  /** Shared messages history for UI components */
  sharedMessagesHistory: IChatMessage[];
  /** Function to handle file drop in chat area */
  handleFileDrop: (files: File[]) => Promise<void>;
}

/**
 * Custom hook that encapsulates all Agent Chat context logic
 *
 * This hook provides:
 * - Complete chat state management
 * - File upload handling
 * - Agent settings management
 * - Chat session lifecycle
 * - Clean context value for ChatProvider
 *
 * @param config - Configuration options
 * @returns Chat context value and related state
 *
 * @example
 * ```tsx
 * const { chatContextValue, agent, isLoading } = useAgentChatContext({
 *   agentId: '123',
 *   onChatReady: () => console.log('Chat ready!'),
 * });
 *
 * return (
 *   <ChatProvider value={chatContextValue}>
 *     <YourChatUI />
 *   </ChatProvider>
 * );
 * ```
 */
export const useAgentChatContext = (
  config: IUseAgentChatContextConfig,
): IUseAgentChatContextReturn => {
  const { agentId, onChatReady, onChatCleared } = config;
  const navigate = useNavigate();

  // Internal refs for tracking state
  const isFirstMessageSentRef = useRef(false);
  const hasInitializedChatRef = useRef(false);

  // ============================================================================
  // API HOOKS
  // ============================================================================

  const { data: agent, isLoading: isAgentLoading } = useAgent(agentId, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    onError: () => navigate('/error/403'),
  });

  const { data: settingsData, isLoading: isAgentSettingsLoading } = useAgentSettings(agentId);
  const { mutateAsync: createChat, isPending: isChatCreating } = useCreateChatMutation();
  const { mutateAsync: updateAgentSettings } = useUpdateAgentSettingsMutation();

  const agentSettings = settingsData?.settings;

  // ============================================================================
  // FILE UPLOAD MANAGEMENT
  // ============================================================================

  const {
    files,
    uploadingFiles,
    uploadError,
    handleFileChange,
    handleFileDrop,
    removeFile,
    clearError,
    isUploadInProgress,
    clearFiles,
  } = useFileUpload({
    agentId,
    chatId: agentSettings?.lastConversationId,
  });

  // ============================================================================
  // CHAT STATE MANAGEMENT
  // ============================================================================

  const {
    messages: messagesHistory,
    isGenerating,
    isProcessing: isInputProcessing,
    sendMessage: sendChatMessage,
    retryLastMessage,
    stopGenerating,
    clearMessages: clearChatMessages,
  } = useChat({
    agentId,
    chatId: agentSettings?.lastConversationId || '',
    avatar: agent?.aiAgentSettings?.avatar,
    onChatComplete: () => {
      if (!isFirstMessageSentRef.current) {
        isFirstMessageSentRef.current = true;
      }
    },
    onError: (err) => {
      console.error('Chat error:', err); // eslint-disable-line no-console
    },
  });

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const inputDisabled = isChatCreating || isAgentLoading || isInputProcessing;
  const queryInputPlaceholder = agent ? `Message ${agent.name}...` : 'Message ...';
  const isMaxFilesUploaded = files.length >= 10; // FILE_LIMITS.MAX_ATTACHED_FILES

  // No conversion needed - using same types now! ✅
  const sharedMessagesHistory: IChatMessage[] = messagesHistory;

  // ============================================================================
  // CHAT ACTIONS
  // ============================================================================

  /**
   * Sends a message with optional file attachments
   * Integrates with the file upload system
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() && files.length === 0) return;

      try {
        // Send message with already-uploaded files
        const filesForChat =
          files.length > 0
            ? (files as unknown as Parameters<typeof sendChatMessage>[1])
            : undefined;
        await sendChatMessage(message, filesForChat);

        // Clear files after successful send
        clearFiles();
      } catch (error) {
        console.error('Failed to send message:', error); // eslint-disable-line no-console
      }
    },
    [sendChatMessage, files, clearFiles],
  );

  /**
   * Creates a new chat session/conversation
   */
  const createNewChatSession = useCallback(async () => {
    try {
      const conversation = await createChat({
        conversation: {
          summary: '',
          chunkSize: 100,
          lastChunkID: '0',
          label: 'New Chat',
          aiAgentId: agentId,
        },
      });

      await updateAgentSettings({
        agentId,
        settings: { key: 'lastConversationId', value: conversation?.id },
      });
    } catch (error) {
      console.error('Error creating chat session', error); // eslint-disable-line no-console
    }
  }, [agentId, createChat, updateAgentSettings]);

  /**
   * Clears current chat session and creates a new one
   */
  const clearChatSession = useCallback(async () => {
    stopGenerating();
    isFirstMessageSentRef.current = false;
    clearChatMessages();
    clearFiles();
    await createNewChatSession();

    // Trigger callback
    onChatCleared?.();

    // Track observability events
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_END);
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_START);
  }, [createNewChatSession, clearChatMessages, clearFiles, stopGenerating, onChatCleared]);

  // ============================================================================
  // LIFECYCLE EFFECTS
  // ============================================================================

  /**
   * Initialize chat session on component mount
   */
  useEffect(() => {
    if (agentSettings && agent && !hasInitializedChatRef.current) {
      agent.aiAgentSettings = agentSettings;
      agent.id = agentId;

      // This ensures fresh conversation every time user loads the page
      hasInitializedChatRef.current = true;
      createNewChatSession().then(() => {
        onChatReady?.();
      });
    }
  }, [agentSettings, agent, agentId, createNewChatSession, onChatReady]);

  /**
   * Track chat session lifecycle for observability
   */
  useEffect(() => {
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_START);
    return () => Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_END);
  }, []);

  // ============================================================================
  // CONTEXT VALUE ASSEMBLY
  // ============================================================================

  const chatContextValue = {
    // File handling
    files,
    uploadingFiles,
    isUploadInProgress,
    isMaxFilesUploaded,
    handleFileChange,
    handleFileDrop,
    removeFile,
    clearFiles,
    uploadError,
    clearError,

    // Chat state
    isGenerating,
    isInputProcessing,
    isRetrying: false, // Not implemented in new hook yet
    messagesHistory: sharedMessagesHistory,
    inputPlaceholder: queryInputPlaceholder,
    inputDisabled,

    // Chat actions
    sendMessage,
    retryLastMessage,
    stopGenerating,
    clearChatSession,
  };

  // ============================================================================
  // RETURN VALUE
  // ============================================================================

  return {
    chatContextValue,
    agent,
    agentSettings: settingsData,
    isLoading: {
      agent: isAgentLoading,
      settings: isAgentSettingsLoading,
      chatCreating: isChatCreating,
    },
    sharedMessagesHistory,
    handleFileDrop,
  };
};
