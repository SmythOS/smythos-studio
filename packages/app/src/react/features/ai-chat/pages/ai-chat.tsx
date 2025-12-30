import { Chats, Container, Footer, Header } from '@react/features/ai-chat/components';
import { ChatContextProvider } from '@react/features/ai-chat/contexts';
import { memo } from 'react';

const AgentChatPage = () => {
  return (
    <ChatContextProvider>
      <Container>
        <Header />
        <Chats />
        <Footer />
      </Container>
    </ChatContextProvider>
  );
};

export default memo(AgentChatPage);
