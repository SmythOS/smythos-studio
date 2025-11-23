import { ChatInputRef } from '@react/features/ai-chat/components/input';
import { ChatContext, IChatContext } from '@react/features/ai-chat/contexts/chat-context';
import { useAgent } from '@src/react/shared/hooks/agent';
import { FC, ReactNode, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAgentSettings } from '../hooks/agent-settings';
import { useAttachments } from '../hooks/use-attachments';
import { useChat } from '../hooks/use-chat';

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
  const agentSettings = settingsData?.settings;
  const agentLoading = isAgentLoading || isAgentSettingsLoading;

  // ============================================================================
  // FILE UPLOAD MANAGEMENT
  // ============================================================================

  const files = useAttachments({ agentId, chatId: agentSettings?.lastConversationId });

  // ============================================================================
  // CHAT STATE MANAGEMENT
  // ============================================================================

  const {
    messages,
    isStreaming,
    isProcessing,

    sendMessage,
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

  // Memoize the store to avoid unnecessary re-renders
  const values: IChatContext = useMemo(
    () => ({
      ref: { input: inputRef, container: containerRef },
      agent: { data: agent, settings: agentSettings, loading: agentLoading },
      files,
      chat: {
        messages,
        isStreaming,
        isProcessing,
        sendMessage,
        retryMessage,
        stopGenerating,
        clearMessages,
      },

      modelOverride,
      setModelOverride,
    }),
    [
      inputRef,
      containerRef,
      agent,
      agentSettings,
      agentLoading,
      files,
      messages,
      isStreaming,
      isProcessing,
      sendMessage,
      retryMessage,
      stopGenerating,
      clearMessages,
      modelOverride,
      setModelOverride,
    ],
  );

  return <ChatContext.Provider value={values}>{children}</ChatContext.Provider>;
};
