import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import {
  ChatHeader,
  ChatInputRef,
  Chats,
  Container,
  Footer,
} from '@react/features/ai-chat/components';
import { ChatProvider } from '@react/features/ai-chat/contexts';
import { useAgentChatContext, useScrollToBottom } from '@react/features/ai-chat/hooks';

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
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // CHAT CONTEXT SETUP
  // ============================================================================
  // All chat logic is now encapsulated in this single hook
  const {
    agent,
    isLoading,
    agentSettings,
    chatContextValue,
    sharedMessagesHistory,
    handleFileDrop,
  } = useAgentChatContext({ agentId: agentId || '', inputRef: chatInputRef });

  // ============================================================================
  // SCROLL BEHAVIOR
  // ============================================================================
  const { smartScrollToBottom, scrollToBottom, showScrollButton, ...scroll } =
    useScrollToBottom(chatContainerRef);

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
    <ChatProvider value={chatContextValue}>
      <Container>
        <ChatHeader agent={agent} isLoading={isLoading} agentSettings={agentSettings?.settings} />

        <Chats
          {...scroll}
          agent={agent}
          messages={sharedMessagesHistory}
          containerRef={chatContainerRef}
          handleFileDrop={handleFileDrop}
          smartScrollToBottom={smartScrollToBottom}
        />

        <Footer
          chatInputRef={chatInputRef}
          clearError={chatContextValue.clearError}
          uploadError={chatContextValue.uploadError}
          scrollToBottom={scrollToBottom}
          showScrollButton={showScrollButton}
          submitDisabled={
            isLoading.chatCreating || isLoading.agent || chatContextValue.uploadingFiles.size > 0
          }
        />
      </Container>
    </ChatProvider>
  );
};

export default AgentChatPage;
