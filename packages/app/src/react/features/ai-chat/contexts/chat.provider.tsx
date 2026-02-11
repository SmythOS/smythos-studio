import { ChatContext, IChatContext, TPageState } from '@react/features/ai-chat/contexts/chat';
import {
  useAgentSettings,
  useChatParams,
  useChatState,
  useCreateChat,
  useFileUpload,
  useSaveAgentSettings,
  useScrollToBottom,
} from '@react/features/ai-chat/hooks';
import type { TChildren } from '@react/features/ai-chat/types';
import { useAgent } from '@react/shared/hooks/agent';
import { Observability } from '@shared/observability';
import { EVENTS } from '@shared/posthog/constants/events';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const ChatContextProvider: FC<TChildren> = ({ children }) => {
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId: string }>();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitializedChatRef = useRef(false);
  const authTokenRef = useRef<string | null>(null);

  const [modelOverride, setModelOverride] = useState<string | null>(null);
  const [isAuthOverridden, setIsAuthOverridden] = useState(false);

  const { data: agent, isLoading: isAgentLoading } = useAgent(agentId, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    onError: () => navigate('/error/403'),
  });

  const { data: settingsData, isLoading: isAgentSettingsLoading } = useAgentSettings(agentId);
  const agentSettings = settingsData?.settings;

  const { data: chatParams, isLoading: isChatParamsLoading } = useChatParams(agentId || null);

  const { mutateAsync: createChat, isPending: isChatCreating } = useCreateChat();
  const { mutateAsync: updateAgentSettings } = useSaveAgentSettings();
  const fileUpload = useFileUpload({
    agentId: agentId || '',
    chatId: agentSettings?.lastConversationId || '',
  });

  const scroll = useScrollToBottom(containerRef);

  const {
    messages,
    setMessages,
    isStreaming,
    sendMessage: addMessage,
    stopStreaming,
    retryLastMessage,
  } = useChatState({
    agentId: agentId || '',
    chatId: agentSettings?.lastConversationId || '',
    modelId: modelOverride || agentSettings?.chatGptModel,
    enableMetaMessages: true,
    inputRef,
    authTokenRef,
  });

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

  const generateAuthToken = useCallback(async () => {
    try {
      if (!agentId) return null;
      const response = await fetch(`/oauth/token/${agentId}`);
      const data = await response.json();
      if (data?.success && data?.token) {
        authTokenRef.current = data.token;
      }
      return null;
    } catch (error) {
      console.error('Error generating auth token', error); // eslint-disable-line no-console
      return null;
    }
  }, [agentId]);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() && fileUpload.attachments.length === 0) return;
      if (fileUpload.uploading) return;

      // Capture the IDs of attachments being sent
      const sentIds = new Set(fileUpload.attachments.map((f) => f.id));

      const attachments = fileUpload.attachments.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        size: f.size,
        url: f.url,
        blobUrl: f.blobUrl,
        file: f.file,
      }));

      try {
        await addMessage(message, attachments);
      } finally {
        // Only clear attachments that were actually sent, keep any new ones added during streaming
        fileUpload.removeByIds(sentIds);
      }
    },
    [fileUpload, addMessage],
  );

  const resetSession = useCallback(async () => {
    stopStreaming();
    setMessages([]);
    fileUpload.clear();
    scroll.hideScrollButton();
    await createSession();

    inputRef.current?.focus();

    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_END);
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_START);
  }, [createSession, setMessages, fileUpload, stopStreaming, scroll]);

  /**
   * Computes the current page state based on loading, auth, and chatbot status
   */
  const pageState: TPageState = useMemo(() => {
    if (isAgentLoading || isAgentSettingsLoading || isChatParamsLoading) {
      return 'loading';
    }
    if (agentSettings?.chatbot === 'false' || chatParams?.chatbotEnabled === false) {
      return 'disabled';
    }
    // Check auth - if overridden locally, skip auth requirement
    if (chatParams?.authRequired && !isAuthOverridden) {
      return 'auth-required';
    }
    return 'ready';
  }, [
    isAgentLoading,
    isAgentSettingsLoading,
    isChatParamsLoading,
    agentSettings?.chatbot,
    chatParams,
    isAuthOverridden,
  ]);

  /**
   * Handler called after successful authentication
   * Directly sets auth as complete (like chatbot does)
   */
  const handleAuthSuccess = useCallback(async () => {
    setIsAuthOverridden(true);
  }, []);

  // Session tracking
  useEffect(() => {
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_START);
    return () => Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_END);
  }, []);

  // Initialize chat session when page is ready
  useEffect(() => {
    if (!hasInitializedChatRef.current && pageState === 'ready') {
      hasInitializedChatRef.current = true;
      createSession().then(() => inputRef.current?.focus());
    }
    if (!authTokenRef.current && pageState === 'auth-required') {
      generateAuthToken();
    }
  }, [pageState, createSession, generateAuthToken]);

  // Auto-focus input
  useEffect(() => {
    const isInputDisabled = isChatCreating || isAgentLoading || isStreaming;
    if (!isAgentLoading && !isInputDisabled) inputRef.current?.focus();
  }, [isAgentLoading, isChatCreating, isStreaming]);

  const contextValue: IChatContext = useMemo(
    () => ({
      refs: { input: inputRef, container: containerRef },
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
        stopStreaming,
        retryMessage: retryLastMessage,
      },
      scroll,
      modelOverride,
      setModelOverride,
      auth: {
        isRequired: (chatParams?.authRequired && !isAuthOverridden) || false,
        method: chatParams?.auth?.method,
        authorizationUrl: chatParams?.auth?.authorizationUrl,
        redirectInternalEndpoint: chatParams?.auth?.redirectInternalEndpoint,
        domain: chatParams?.domain,
        onAuthSuccess: handleAuthSuccess,
      },
      pageState,
    }),
    [
      agent,
      agentSettings,
      chatParams,
      fileUpload,
      handleAuthSuccess,
      isAgentLoading,
      isAgentSettingsLoading,
      isAuthOverridden,
      isChatCreating,
      isStreaming,
      messages,
      modelOverride,
      pageState,
      resetSession,
      retryLastMessage,
      scroll,
      sendMessage,
      stopStreaming,
    ],
  );

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};
