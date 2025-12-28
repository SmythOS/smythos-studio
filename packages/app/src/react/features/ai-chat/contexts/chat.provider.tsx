import {
  useAgentSettings,
  useChatState,
  useCreateChatMutation,
  useFileUpload,
  useScrollToBottom,
  useUpdateAgentSettingsMutation,
} from '@react/features/ai-chat/hooks';
import type { TChildren } from '@react/features/ai-chat/types';
import { useAgent } from '@react/shared/hooks/agent';
import { Observability } from '@shared/observability';
import { EVENTS } from '@shared/posthog/constants/events';
import { ChatContext, IChatContext } from '@react/features/ai-chat/contexts/chat';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const ChatContextProvider: FC<TChildren> = ({ children }) => {
  const params = useParams<{ agentId: string }>();
  const agentId = params?.agentId;

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const hasInitializedChatRef = useRef(false);
  const [modelOverride, setModelOverride] = useState<string | null>(null);

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

  const fileUpload = useFileUpload({
    agentId: agentId || '',
    chatId: agentSettings?.lastConversationId || '',
  });

  const scroll = useScrollToBottom(containerRef);

  const chatStateV2 = useChatState({
    agentId: agentId || '',
    chatId: agentSettings?.lastConversationId || '',
    modelId: modelOverride || agentSettings?.chatGptModel,
    enableMetaMessages: true,
    inputRef,
  });

  const {
    messages,
    setMessages,
    isStreaming,
    sendMessage: sendMessageV2,
    stopStreaming,
    retryLastMessage,
  } = chatStateV2;

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() && fileUpload.attachments.length === 0) return;

      try {
        const attachments = fileUpload.attachments.map((f) => ({
          name: f.name,
          type: f.type,
          size: f.size,
          url: f.url,
          blobUrl: f.blobUrl,
          file: f.file,
        }));

        await sendMessageV2(message, attachments);
        fileUpload.clear();
      } catch (error) {
        console.error('Failed to send message:', error); // eslint-disable-line no-console
      }
    },
    [fileUpload, sendMessageV2],
  );

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

  const resetSession = useCallback(async () => {
    stopStreaming();
    setMessages([]);
    fileUpload.clear();
    await createSession();

    inputRef?.current?.focus();

    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_END);
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_START);
  }, [createSession, setMessages, fileUpload, stopStreaming, inputRef]);

  useEffect(() => {
    if (agentSettings && agent && !hasInitializedChatRef.current) {
      agent.aiAgentSettings = agentSettings;
      agent.id = agentId;

      hasInitializedChatRef.current = true;
      createSession().then(() => inputRef?.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentSettings, agent, agentId]);

  useEffect(() => {
    Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_START);
    return () => Observability.observeInteraction(EVENTS.CHAT_EVENTS.SESSION_END);
  }, []);

  useEffect(() => {
    const inputDisabled = isChatCreating || isAgentLoading || isStreaming;
    if (!isAgentLoading && !inputDisabled) inputRef.current?.focus();
  }, [isAgentLoading, isChatCreating, isStreaming]);

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
        stopStreaming,
        retryMessage: retryLastMessage,
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
      sendMessage,
      retryLastMessage,
      stopStreaming,
      resetSession,
      scroll,
      modelOverride,
      setModelOverride,
    ],
  );

  return <ChatContext.Provider value={values}>{children}</ChatContext.Provider>;
};

