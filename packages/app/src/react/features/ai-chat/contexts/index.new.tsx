import { ChatInputRef } from '@react/features/ai-chat/components/input';
import { ChatContext, IChatContext } from '@react/features/ai-chat/contexts/chat-context';
import { useAgent } from '@src/react/shared/hooks/agent';
import { FC, ReactNode, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAgentSettings } from '../hooks/agent-settings';
import { useAttachments } from '../hooks/use-attachments';

interface IProps {
  children: ReactNode;
}

export const ChatContextProvider: FC<IProps> = ({ children }) => {
  const params = useParams<{ agentId: string }>();
  const agentId = params?.agentId;

  const inputRef = useRef<ChatInputRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

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

  // Memoize the store to avoid unnecessary re-renders
  const values: IChatContext = useMemo(
    () => ({
      ref: { input: inputRef, container: containerRef },
      agent: { data: agent, settings: agentSettings, loading: agentLoading },
      files,
    }),
    [inputRef, containerRef, agent, agentSettings, agentLoading, files],
  );

  return <ChatContext.Provider value={values}>{children}</ChatContext.Provider>;
};
