/* eslint-disable no-console, react-hooks/exhaustive-deps */
import { FC, MutableRefObject, RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ChatContainer,
  ChatHeader,
  ChatHistory,
  ErrorToast,
  QueryInput,
  QueryInputRef,
  ScrollToBottomButton,
  WarningInfo,
} from '@react/features/ai-chat/components';
import { ChatProvider } from '@react/features/ai-chat/contexts';
import {
  useAgentSettings,
  useChatActions,
  useCreateChatMutation,
  useDragAndDrop,
  useFileUpload,
  useScrollToBottom,
  useUpdateAgentSettingsMutation,
} from '@react/features/ai-chat/hooks';
import { useAgent } from '@react/shared/hooks/agent';
import { EVENTS } from '@shared/posthog/constants/events';
import { Analytics } from '@shared/posthog/services/analytics';
import { FILE_LIMITS } from '@src/react/features/ai-chat/utils/file';

const CHAT_WARNING_INFO =
  "SmythOS can make mistakes, always check your work. We don't store chat history, save important work."; // eslint-disable-line max-len, quotes

interface AIChatProps {
  givenAgent?: string;
  isMenuVisible?: boolean;
  isWarningVisible?: boolean;
}

/**
 * Combines multiple refs into a single ref callback
 * @param refs - Array of refs to combine
 */
const combineRefs = <T extends HTMLElement>(
  ...refs: Array<RefObject<T> | MutableRefObject<T | null>>
) => {
  return (element: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      (ref as MutableRefObject<T | null>).current = element;
    });
  };
};

const AIChat: FC<AIChatProps> = ({
  givenAgent,
  isMenuVisible = false,
  isWarningVisible = false,
}) => {
  const params = useParams<{ agentId: string }>();
  const agentId = givenAgent || params?.agentId;
  const queryInputRef = useRef<QueryInputRef>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstMessageSentRef = useRef(false);
  const navigate = useNavigate();

  // API Hooks
  const { data: currentAgent, isLoading: isAgentLoading } = useAgent(agentId, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    onError: () => navigate('/error/403'),
  });

  const { data: agentSettingsData } = useAgentSettings(agentId);
  const { mutateAsync: createChat, isLoading: isChatCreating } = useCreateChatMutation();
  const { mutateAsync: updateAgentSettings } = useUpdateAgentSettingsMutation();

  // Custom Hooks
  const { showScrollButton, handleScroll, scrollToBottom, setShowScrollButton } =
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

  const dropzoneRef = useDragAndDrop({ onDrop: handleFileDrop });

  const {
    chatHistoryMessages,
    isGenerating,
    isQueryInputProcessing,
    isRetrying,
    sendMessage,
    retryLastMessage,
    stopGenerating,
    clearMessages,
  } = useChatActions({
    agentId,
    chatId: agentSettingsData?.settings?.lastConversationId,
    avatar: currentAgent?.aiAgentSettings?.avatar,
    onChatComplete: () => {
      if (!isFirstMessageSentRef.current) {
        isFirstMessageSentRef.current = true;
      }
    },
  });

  // Memoized Values
  const isQueryInputDisabled = useMemo(
    () => isChatCreating || isAgentLoading || isQueryInputProcessing,
    [isChatCreating, isAgentLoading, isQueryInputProcessing],
  );

  const queryInputPlaceholder = useMemo(
    () => (currentAgent ? `Message ${currentAgent?.name}...` : 'Message ...'),
    [currentAgent],
  );

  const isMaxFilesUploaded = useMemo(() => files.length >= FILE_LIMITS.MAX_ATTACHED_FILES, [files]);

  // Callbacks
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

      saveConversationIdToAgentSettings(conversation?.id);
    } catch (error) {
      console.error('Error creating chat session', error);
    }
  }, [agentId, createChat]);

  const saveConversationIdToAgentSettings = useCallback(
    async (conversationId: string) => {
      try {
        await updateAgentSettings({
          agentId,
          settings: { key: 'lastConversationId', value: conversationId },
        });
      } catch (error) {
        console.error('Error saving conversation ID to agent settings', error);
      }
    },
    [agentId, updateAgentSettings],
  );

  const clearChatSession = useCallback(async () => {
    // First stop any ongoing generation
    stopGenerating();
    // Then clear the UI and create new chat
    setShowScrollButton(false);
    isFirstMessageSentRef.current = false;
    clearMessages();
    await createNewChatSession();
    queryInputRef.current?.focus();
    Analytics.track(EVENTS.CHAT_EVENTS.SESSION_END);
    Analytics.track(EVENTS.CHAT_EVENTS.SESSION_START);
  }, [createNewChatSession, clearMessages, stopGenerating]);

  // Effects
  useEffect(() => {
    if (agentSettingsData?.settings && currentAgent) {
      currentAgent.aiAgentSettings = agentSettingsData.settings;
      currentAgent.id = agentId;

      if (currentAgent?.aiAgentSettings?.lastConversationId) {
        saveConversationIdToAgentSettings(currentAgent.aiAgentSettings.lastConversationId);
      } else {
        createNewChatSession();
      }
    }
  }, [agentSettingsData, currentAgent, agentId]);

  useEffect(() => {
    if (!isAgentLoading && !isQueryInputDisabled) {
      queryInputRef.current?.focus();
    }
  }, [isAgentLoading, isQueryInputDisabled]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistoryMessages]);

  useEffect(() => {
    Analytics.track(EVENTS.CHAT_EVENTS.SESSION_START);
    return () => {
      Analytics.track(EVENTS.CHAT_EVENTS.SESSION_END);
    };
  }, []);

  // Create the context value
  const chatContextValue = useMemo(
    () => ({
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
      isQueryInputProcessing,
      isRetrying,
      chatHistoryMessages,
      queryInputPlaceholder,
      isQueryInputDisabled,

      // Chat actions
      sendMessage,
      retryLastMessage,
      stopGenerating,
      clearChatSession,
    }),
    [
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
      isGenerating,
      isQueryInputProcessing,
      isRetrying,
      chatHistoryMessages,
      queryInputPlaceholder,
      isQueryInputDisabled,
      sendMessage,
      retryLastMessage,
      stopGenerating,
      clearChatSession,
    ],
  );

  return (
    <ChatProvider value={chatContextValue}>
      <div className="w-full h-full max-h-screen bg-white">
        {!isMenuVisible && (
          <ChatHeader
            agentName={currentAgent?.name || '...'}
            avatar={agentSettingsData?.settings?.avatar}
          />
        )}

        <ChatContainer>
          <div
            className="w-full h-full flex justify-center overflow-auto relative scroll-smooth"
            ref={combineRefs(chatContainerRef, dropzoneRef)}
            onScroll={handleScroll}
          >
            <div className="w-full pt-12 max-w-3xl mt-5 px-8">
              <ChatHistory
                agent={currentAgent}
                chatId={agentSettingsData?.settings?.lastConversationId}
                messages={chatHistoryMessages}
              />
            </div>
            {showScrollButton && <ScrollToBottomButton onClick={() => scrollToBottom(true)} />}
          </div>
          {uploadError.show && (
            <div className="w-full max-w-3xl">
              <ErrorToast message={uploadError.message} onClose={clearError} />
            </div>
          )}
          <div className="w-full max-w-3xl mt-[10px]">
            <QueryInput
              ref={queryInputRef}
              submitDisabled={isChatCreating || isAgentLoading || uploadingFiles.size > 0}
            />
            {!isWarningVisible && <WarningInfo infoMessage={CHAT_WARNING_INFO} />}
          </div>
        </ChatContainer>
      </div>
    </ChatProvider>
  );
};

export default AIChat;
