import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ChatHeader,
  ChatInputRef,
  Chats,
  Container,
  Footer,
} from '@react/features/ai-chat/components';
import { ChatProvider } from '@react/features/ai-chat/contexts';
import {
  useAgentSettings,
  useChatActions,
  useCreateChatMutation,
  useFileUpload,
  useScrollToBottom,
  useUpdateAgentSettingsMutation,
} from '@react/features/ai-chat/hooks';
import { FILE_LIMITS } from '@react/features/ai-chat/utils/file';
import { useAgent } from '@react/shared/hooks/agent';
import { EVENTS } from '@shared/posthog/constants/events';
import { Analytics } from '@shared/posthog/services/analytics';

const AIChat = () => {
  const params = useParams<{ agentId: string }>();
  const agentId = params?.agentId;
  const chatInputRef = useRef<ChatInputRef>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMessageSentRef = useRef(false);
  const navigate = useNavigate();

  // API Hooks - optimized with minimal dependencies
  const { data: agent, isLoading: isAgentLoading } = useAgent(agentId || '', {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    onError: () => navigate('/error/403'),
  });

  const { data: settingsData, isLoading: isAgentSettingsLoading } = useAgentSettings(agentId || '');
  const { mutateAsync: createChat, isPending: isChatCreating } = useCreateChatMutation();
  const { mutateAsync: updateAgentSettings } = useUpdateAgentSettingsMutation();

  const agentSettings = settingsData?.settings;

  // Custom Hooks - optimized
  const { setShowScrollButton, smartScrollToBottom, ...scroll } =
    useScrollToBottom(chatContainerRef);

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
  } = useFileUpload();

  const {
    messagesHistory,
    isGenerating,
    isInputProcessing,
    isRetrying,
    sendMessage,
    retryLastMessage,
    stopGenerating,
    clearMessages,
  } = useChatActions({
    agentId: agentId || '',
    chatId: agentSettings?.lastConversationId,
    avatar: agent?.aiAgentSettings?.avatar,
    onChatComplete: () => {
      if (!isFirstMessageSentRef.current) {
        isFirstMessageSentRef.current = true;
      }
    },
  });

  // Fast memoized values - minimal dependencies
  const inputDisabled = isChatCreating || isAgentLoading || isInputProcessing;
  const queryInputPlaceholder = agent ? `Message ${agent?.name}...` : 'Message ...';
  const isMaxFilesUploaded = files.length >= FILE_LIMITS.MAX_ATTACHED_FILES;

  // Fast callbacks - minimal dependencies
  const createNewChatSession = useCallback(async () => {
    try {
      const conversation = await createChat({
        conversation: {
          summary: '',
          chunkSize: 100,
          lastChunkID: '0',
          label: 'New Chat',
          aiAgentId: agentId || '',
        },
      });

      await updateAgentSettings({
        agentId: agentId || '',
        settings: { key: 'lastConversationId', value: conversation?.id },
      });
    } catch (error) {
      console.error('Error creating chat session', error); // eslint-disable-line no-console
    }
  }, [agentId, createChat, updateAgentSettings]);

  const clearChatSession = useCallback(async () => {
    stopGenerating();
    setShowScrollButton(false);
    isFirstMessageSentRef.current = false;
    clearMessages();
    await createNewChatSession();
    chatInputRef.current?.focus();
    Analytics.track(EVENTS.CHAT_EVENTS.SESSION_END);
    Analytics.track(EVENTS.CHAT_EVENTS.SESSION_START);
  }, [createNewChatSession, clearMessages, stopGenerating, setShowScrollButton]);

  useEffect(() => {
    if (agentSettings && agent) {
      agent.aiAgentSettings = agentSettings;
      agent.id = agentId;

      if (!agent?.aiAgentSettings?.lastConversationId) {
        createNewChatSession();
      }
    }
  }, [agentSettings, agent, agentId, createNewChatSession]);

  useEffect(() => {
    if (!isAgentLoading && !inputDisabled) chatInputRef.current?.focus();
  }, [isAgentLoading, inputDisabled]);

  useEffect(() => {
    Analytics.track(EVENTS.CHAT_EVENTS.SESSION_START);
    return () => Analytics.track(EVENTS.CHAT_EVENTS.SESSION_END);
  }, []);

  // Fast context value - minimal dependencies
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
    isRetrying,
    messagesHistory,
    inputPlaceholder: queryInputPlaceholder,
    inputDisabled,

    // Chat actions
    sendMessage,
    retryLastMessage,
    stopGenerating,
    clearChatSession,
  };

  return (
    <ChatProvider value={chatContextValue}>
      <Container>
        <ChatHeader
          agentName={agent?.name}
          avatar={agentSettings?.avatar}
          isAgentLoading={isAgentLoading}
          isAvatarLoading={isAgentSettingsLoading}
        />

        <Chats
          {...scroll}
          agent={agent}
          messages={messagesHistory}
          containerRef={chatContainerRef}
          handleFileDrop={handleFileDrop}
          smartScrollToBottom={smartScrollToBottom}
        />
        <Footer
          uploadError={uploadError}
          clearError={clearError}
          chatInputRef={chatInputRef}
          submitDisabled={isChatCreating || isAgentLoading || uploadingFiles.size > 0}
        />
      </Container>
    </ChatProvider>
  );
};

export default AIChat;
