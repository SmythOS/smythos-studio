import { ChatContext, IChatContext } from '@react/features/ai-chat/contexts/chat';
import {
  useAgentSettings,
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

  const [modelOverride, setModelOverride] = useState<string | null>(null);

  const { data: agent, isLoading: isAgentLoading } = useAgent(agentId, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    onError: () => navigate('/error/403'),
  });

  const { data: settingsData, isLoading: isAgentSettingsLoading } = useAgentSettings(agentId);
  const agentSettings = settingsData?.settings;

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

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() && fileUpload.attachments.length === 0) return;

      try {
        const attachments = fileUpload.attachments.map((f) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          size: f.size,
          url: f.url,
          blobUrl: f.blobUrl,
          file: f.file,
        }));

        await addMessage(message, attachments);
        fileUpload.clear();
      } catch (error) {
        console.error('Failed to send message:', error); // eslint-disable-line no-console
      }
    },
    [fileUpload, addMessage],
  );

  const resetSession = useCallback(async () => {
    stopStreaming();
    setMessages([]);
    fileUpload.clear();
    await createSession();

    inputRef.current?.focus();

    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_END);
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_START);
  }, [createSession, setMessages, fileUpload, stopStreaming]);

  // Session tracking
  useEffect(() => {
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_START);
    return () => Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_END);
  }, []);

  // Initialize chat session
  useEffect(() => {
    if (agentSettings && agent && !hasInitializedChatRef.current) {
      hasInitializedChatRef.current = true;
      createSession().then(() => inputRef.current?.focus());
    }
  }, [agentSettings, agent, createSession]);

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
    }),
    [
      agent,
      agentSettings,
      fileUpload,
      isAgentLoading,
      isAgentSettingsLoading,
      isChatCreating,
      isStreaming,
      messages,
      modelOverride,
      resetSession,
      retryLastMessage,
      scroll,
      sendMessage,
      stopStreaming,
    ],
  );

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};
