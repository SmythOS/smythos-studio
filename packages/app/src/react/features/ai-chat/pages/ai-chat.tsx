import { ChatContent, Container } from '@react/features/ai-chat/components';
import { ChatContextProvider } from '@react/features/ai-chat/contexts';
import { memo } from 'react';

/**
 * Main AI Chat page component
 * Wraps chat content with context provider and container
 */
const AgentChatPage = () => {
  return (
    <ChatContextProvider>
      <Container>
        <ChatContent />
      </Container>
    </ChatContextProvider>
  );
};

export default memo(AgentChatPage);
