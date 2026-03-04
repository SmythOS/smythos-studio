import { Chats, Disabled, Footer, Header } from '@react/features/ai-chat/components';
import { DEFAULT_AVATAR_URL } from '@react/features/ai-chat/constants';
import { useChatStores } from '@react/features/ai-chat/hooks';

/**
 * Handles conditional rendering based on page state
 * Renders appropriate UI for loading, auth, disabled, or ready states
 */
export const ChatContent = () => {
  const { pageState, agent } = useChatStores();

  // Loading state
  // if (pageState === 'loading') return <LoadingSkeleton />;

  // Chatbot disabled
  if (pageState === 'disabled') {
    const agentName = agent?.data?.name || 'Agent';
    const agentAvatar = agent?.settings?.avatar || DEFAULT_AVATAR_URL;

    return <Disabled name={agentName} avatar={agentAvatar} />;
  }

  // Ready - show full chat UI
  return (
    <>
      <Header />
      <Chats />
      <Footer />
    </>
  );
};
