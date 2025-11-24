import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { ChatHeader, Chats, Container, Footer } from '@react/features/ai-chat/components';
import { ChatProvider } from '@react/features/ai-chat/contexts';
import { ChatContextProvider } from '@react/features/ai-chat/contexts/index.new';
import { useAgentChatContext } from '@react/features/ai-chat/hooks';
import { ChatInputRef } from '@react/features/ai-chat/types/chat.types';

/**
 * Agent Chat Page Component
 * Modern implementation using new chat hooks with professional architecture
 *
 * This component is a thin wrapper that:
 * 1. Extracts route params
 * 2. Sets up chat context via useAgentChatContext hook
 * 3. Manages UI refs (input, container)
 * 4. Handles scroll behavior
 * 5. Renders chat UI components
 */
const AgentChatPage = () => {
  const params = useParams<{ agentId: string }>();
  const agentId = params?.agentId;

  // UI refs for input focus and scroll management
  const chatInputRef = useRef<ChatInputRef>(null);

  // ============================================================================
  // CHAT CONTEXT SETUP
  // ============================================================================
  // All chat logic is now encapsulated in this single hook
  const { isLoading, chatContextValue } = useAgentChatContext({
    agentId: agentId || '',
    inputRef: chatInputRef,
  });

  // ============================================================================
  // UI EFFECTS
  // ============================================================================

  /**
   * Auto-focus input when agent is loaded and not disabled
   */
  useEffect(() => {
    if (!isLoading.agent && !chatContextValue.inputDisabled) chatInputRef.current?.focus();
  }, [isLoading.agent, chatContextValue.inputDisabled]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ChatContextProvider>
      <ChatProvider value={chatContextValue}>
        <Container>
          <ChatHeader />
          <Chats />
          <Footer />
        </Container>
      </ChatProvider>
    </ChatContextProvider>
  );
};

export default AgentChatPage;
