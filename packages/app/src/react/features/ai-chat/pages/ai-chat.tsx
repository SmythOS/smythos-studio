import { FC, MutableRefObject, RefObject, useCallback, useEffect, useRef } from 'react';
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
import { FILE_LIMITS } from '@react/features/ai-chat/utils/file';
import { useAgent } from '@react/shared/hooks/agent';
import { EVENTS } from '@shared/posthog/constants/events';
import { Analytics } from '@shared/posthog/services/analytics';

const CHAT_WARNING_INFO =
  "SmythOS can make mistakes, always check your work. We don't store chat history, save important work."; // eslint-disable-line quotes

interface AIChatProps {
  givenAgent?: string;
  isMenuVisible?: boolean;
  isWarningVisible?: boolean;
}

/**
 * Combines multiple refs into a single ref callback
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

  // API Hooks - optimized with minimal dependencies
  const { data: currentAgent, isLoading: isAgentLoading } = useAgent(agentId || '', {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    onError: () => navigate('/error/403'),
  });

  const { data: agentSettingsData } = useAgentSettings(agentId || '');
  const { mutateAsync: createChat, isPending: isChatCreating } = useCreateChatMutation();
  const { mutateAsync: updateAgentSettings } = useUpdateAgentSettingsMutation();

  // Custom Hooks - optimized
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
    agentId: agentId || '',
    chatId: agentSettingsData?.settings?.lastConversationId,
    avatar: currentAgent?.aiAgentSettings?.avatar,
    onChatComplete: () => {
      if (!isFirstMessageSentRef.current) {
        isFirstMessageSentRef.current = true;
      }
    },
  });

  // Fast memoized values - minimal dependencies
  const isQueryInputDisabled = isChatCreating || isAgentLoading || isQueryInputProcessing;
  const queryInputPlaceholder = currentAgent ? `Message ${currentAgent?.name}...` : 'Message ...';
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
    queryInputRef.current?.focus();
    Analytics.track(EVENTS.CHAT_EVENTS.SESSION_END);
    Analytics.track(EVENTS.CHAT_EVENTS.SESSION_START);
  }, [createNewChatSession, clearMessages, stopGenerating, setShowScrollButton]);

  useEffect(() => {
    if (agentSettingsData?.settings && currentAgent) {
      currentAgent.aiAgentSettings = agentSettingsData.settings;
      currentAgent.id = agentId;

      if (!currentAgent?.aiAgentSettings?.lastConversationId) {
        createNewChatSession();
      }
    }
  }, [agentSettingsData, currentAgent, agentId, createNewChatSession]);

  useEffect(() => {
    if (!isAgentLoading && !isQueryInputDisabled) queryInputRef.current?.focus();
  }, [isAgentLoading, isQueryInputDisabled]);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistoryMessages, scrollToBottom]);

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
  };

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
            <div className="w-full pt-16 max-w-4xl mt-0">
              <ChatHistory
                agent={currentAgent}
                chatId={agentSettingsData?.settings?.lastConversationId || ''}
                messages={chatHistoryMessages}
              />
            </div>
            {showScrollButton && <ScrollToBottomButton onClick={() => scrollToBottom(true)} />}
          </div>
          {uploadError.show && (
            <div className="w-full max-w-4xl">
              <ErrorToast message={uploadError.message} onClose={clearError} />
            </div>
          )}
          <div className="w-full max-w-4xl mt-[10px]">
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
