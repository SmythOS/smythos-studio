import { ChatContext, IChatContext } from '@react/features/ai-chat/contexts/chat-context';
import {
  useAgentSettings,
  useAttachments,
  useChat,
  useCreateChatMutation,
  useScrollToBottom,
  useUpdateAgentSettingsMutation,
} from '@react/features/ai-chat/hooks';
import { ChatInputRef } from '@react/features/ai-chat/types/chat.types';
import { useAgent } from '@react/shared/hooks/agent';
import { Observability } from '@shared/observability';
import { EVENTS } from '@shared/posthog/constants/events';
import { FC, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface IProps {
  children: ReactNode;
}

export const ChatContextProvider: FC<IProps> = ({ children }) => {
  const params = useParams<{ agentId: string }>();
  const agentId = params?.agentId;

  const inputRef = useRef<ChatInputRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  // Internal refs for tracking state
  const isFirstMessageSentRef = useRef(false);
  const hasInitializedChatRef = useRef(false);

  // Model override state (temporary, not saved to agent config)
  const [modelOverride, setModelOverride] = useState<string | null>(null);

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

  const files = useAttachments({ agentId, chatId: agentSettings?.lastConversationId });

  // ============================================================================
  // SCROLL BEHAVIOR
  // ============================================================================

  const scroll = useScrollToBottom(containerRef);

  // ============================================================================
  // CHAT STATE MANAGEMENT
  // ============================================================================

  const {
    messages,
    isStreaming,
    isProcessing,

    sendMessage: sendChatMessage,
    retryMessage,
    clearMessages,
    stopGenerating,
  } = useChat({
    agentId,
    chatId: agentSettings?.lastConversationId || '',
    modelId: modelOverride || agentSettings?.chatGptModel, // Use override if set, otherwise fall back to agent's default model
    onChatComplete: () => {
      if (!isFirstMessageSentRef.current) {
        isFirstMessageSentRef.current = true;
      }
    },
    onError: (err) => console.error('Chat error:', err), // eslint-disable-line no-console
  });

  // ============================================================================
  // CHAT ACTIONS
  // ============================================================================

  /**
   * Sends a message with optional file attachments
   * Integrates with the file upload system
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() && files.data.length === 0) return;

      try {
        // Send message with already-uploaded files
        const filesForChat =
          files.data.length > 0
            ? (files.data as unknown as Parameters<typeof sendChatMessage>[1])
            : undefined;
        await sendChatMessage(message, filesForChat);

        // Clear files after successful send
        files.clearFiles();
      } catch (error) {
        console.error('Failed to send message:', error); // eslint-disable-line no-console
      }
    },
    [files, sendChatMessage],
  );

  /**
   * Creates a new chat session/conversation
   */
  const createSession = useCallback(async () => {
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
  const resetSession = useCallback(async () => {
    stopGenerating();
    isFirstMessageSentRef.current = false;
    clearMessages();
    files.clearFiles();
    await createSession();

    // Trigger callback
    inputRef?.current?.focus();

    // Track observability events
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_END);
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_START);
  }, [createSession, clearMessages, files, stopGenerating, inputRef]);

  // ============================================================================
  // LIFECYCLE EFFECTS
  // ============================================================================

  /**
   * Initialize chat session on component mount
   * Only runs once when both agent and settings are loaded
   */
  useEffect(() => {
    if (agentSettings && agent && !hasInitializedChatRef.current) {
      agent.aiAgentSettings = agentSettings;
      agent.id = agentId;

      // This ensures fresh conversation every time user loads the page
      hasInitializedChatRef.current = true;
      createSession().then(() => inputRef?.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentSettings, agent, agentId]); // Only depend on core values, not callbacks

  /**
   * Track chat session lifecycle for observability
   */
  useEffect(() => {
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_START);
    return () => Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_END);
  }, []);

  /**
   * Auto-focus input when agent is loaded and not disabled
   */
  useEffect(() => {
    const inputDisabled = isChatCreating || isAgentLoading || isProcessing;
    if (!isAgentLoading && !inputDisabled) inputRef.current?.focus();
  }, [isAgentLoading, isChatCreating, isProcessing]);

  // Memoize the store to avoid unnecessary re-renders
  const values: IChatContext = useMemo(
    () => ({
      ref: { input: inputRef, container: containerRef },
      agent: {
        data: agent,
        settings: agentSettings,
        isLoading: { agent: isAgentLoading, settings: isAgentSettingsLoading },
      },
      files,
      chat: {
        isChatCreating,
        messages,
        isStreaming,
        isProcessing,
        createSession,
        sendMessage,
        retryMessage,
        stopGenerating,
        clearMessages,
        resetSession,
      },

      scroll,

      modelOverride,
      setModelOverride,
    }),
    [
      inputRef,
      containerRef,
      agent,
      agentSettings,
      isAgentLoading,
      isAgentSettingsLoading,
      files,

      isChatCreating,
      messages,
      isStreaming,
      isProcessing,
      createSession,
      sendMessage,
      retryMessage,
      stopGenerating,
      clearMessages,
      resetSession,

      scroll,

      modelOverride,
      setModelOverride,
    ],
  );

  return <ChatContext.Provider value={values}>{children}</ChatContext.Provider>;
};
