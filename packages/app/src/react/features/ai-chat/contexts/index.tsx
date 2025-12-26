import {
  useAgentSettings,
  useCreateChatMutation,
  useScrollToBottom,
  useUpdateAgentSettingsMutation,
} from '@react/features/ai-chat/hooks';
import { useChatState } from '@react/features/ai-chat/hooks/use-chat-state';
import { useFileUpload } from '@react/features/ai-chat/hooks/use-file-upload';
import { ChatInputRef, IChildren } from '@react/features/ai-chat/types/chat.types';
import { useAgent } from '@react/shared/hooks/agent';
import { Observability } from '@shared/observability';
import { EVENTS } from '@shared/posthog/constants/events';
import { ChatContext, IChatContext } from '@src/react/features/ai-chat/contexts/chat';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const ChatContextProvider: FC<IChildren> = ({ children }) => {
  const params = useParams<{ agentId: string }>();
  const agentId = params?.agentId;

  const inputRef = useRef<ChatInputRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  // Internal ref for tracking initialization state
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

  const fileUpload = useFileUpload({
    agentId: agentId || '',
    chatId: agentSettings?.lastConversationId || '',
  });

  // ============================================================================
  // SCROLL BEHAVIOR
  // ============================================================================

  const scroll = useScrollToBottom(containerRef);

  // ============================================================================
  // CHAT STATE MANAGEMENT
  // ============================================================================

  const chatStateV2 = useChatState({
    agentId: agentId || '',
    chatId: agentSettings?.lastConversationId || '',
    modelId: modelOverride || agentSettings?.chatGptModel,
    enableMetaMessages: true,
    inputRef,
  });

  // Destructure for easier access
  const {
    messages,
    setMessages,
    isStreaming,
    sendMessage: sendMessageV2,
    stopStreaming,
    retryLastMessage,
  } = chatStateV2;

  // ============================================================================
  // CHAT ACTIONS
  // ============================================================================

  /**
   * Sends a message with optional file attachments
   * Integrates with the file upload system
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() && fileUpload.attachments.length === 0) return;

      try {
        // Convert V2 attachments to IAttachment format
        const attachments = fileUpload.attachments.map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
          url: f.url,
          blobUrl: f.blobUrl,
          file: f.file,
        }));

        await sendMessageV2(message, attachments);

        // Clear files after successful send
        fileUpload.clear();
      } catch (error) {
        console.error('Failed to send message:', error); // eslint-disable-line no-console
      }
    },
    [fileUpload, sendMessageV2],
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
    stopStreaming();
    setMessages([]);
    fileUpload.clear();
    await createSession();

    // Trigger callback
    inputRef?.current?.focus();

    // Track observability events
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_END);
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_START);
  }, [createSession, setMessages, fileUpload, stopStreaming, inputRef]);

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
    const inputDisabled = isChatCreating || isAgentLoading || isStreaming;
    if (!isAgentLoading && !inputDisabled) inputRef.current?.focus();
  }, [isAgentLoading, isChatCreating, isStreaming]);

  // Memoize the store to avoid unnecessary re-renders
  const values: IChatContext = useMemo(
    () => ({
      ref: { input: inputRef, container: containerRef },
      agent: {
        data: agent,
        settings: agentSettings,
        isLoading: { agent: isAgentLoading, settings: isAgentSettingsLoading },
      },
      files: fileUpload,
      chat: {
        isChatCreating,
        messages,
        isStreaming,
        sendMessage,
        resetSession,
        createSession,
        stopStreaming,
        retryMessage: retryLastMessage,
        clearMessages: () => setMessages([]),
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
      fileUpload,
      isChatCreating,
      messages,
      isStreaming,
      createSession,
      sendMessage,
      retryLastMessage,
      stopStreaming,
      setMessages,
      resetSession,
      scroll,
      modelOverride,
      setModelOverride,
    ],
  );

  return <ChatContext.Provider value={values}>{children}</ChatContext.Provider>;
};
