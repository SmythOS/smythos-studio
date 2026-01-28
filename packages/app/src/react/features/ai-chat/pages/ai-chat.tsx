import { AuthOverlay } from '@react/features/ai-chat/components/auth/auth-overlay';
import { Chats, Container, Footer, Header } from '@react/features/ai-chat/components';
import { Skeleton } from '@react/features/ai-chat/components/header/skeleton';
import { ChatContextProvider } from '@react/features/ai-chat/contexts';
import { useChatStores } from '@react/features/ai-chat/hooks';
import { memo } from 'react';

/**
 * Loading skeleton that mimics the chat UI layout
 */
const LoadingSkeleton = () => (
  <>
    {/* Header skeleton */}
    <div className="w-full max-w-4xl flex items-center gap-3 py-4 px-2">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="w-32 h-4 rounded" />
        <Skeleton className="w-20 h-3 rounded" />
      </div>
    </div>

    {/* Chat area skeleton */}
    <div className="w-full h-full flex-1 flex flex-col items-center justify-start pt-8 gap-4 overflow-hidden">
      <div className="w-full max-w-4xl space-y-4 px-2">
        <div className="flex justify-start">
          <Skeleton className="w-3/4 h-16 rounded-2xl" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="w-1/2 h-12 rounded-2xl" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="w-2/3 h-20 rounded-2xl" />
        </div>
      </div>
    </div>

    {/* Footer skeleton */}
    <div className="w-full max-w-4xl py-4 px-2">
      <Skeleton className="w-full h-14 rounded-2xl" />
    </div>
  </>
);

/**
 * Handles conditional rendering based on page state
 */
const ChatContent = () => {
  const { pageState } = useChatStores();

  // Loading state
  if (pageState === 'loading') {
    return <LoadingSkeleton />;
  }

  // Auth required
  if (pageState === 'auth-required') {
    return <AuthOverlay />;
  }

  // Chatbot disabled
  if (pageState === 'disabled') {
    return (
      <>
        <Header />
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center max-w-md p-8">
            <p className="text-gray-600">This feature is disabled for your SmythOS Agent.</p>
            <p className="text-gray-500 mt-2 text-sm">
              To enable it, go to <strong>Agent Settings → Deployments</strong> and turn on{' '}
              <strong>&quot;Chatbot&quot;</strong>
            </p>
          </div>
        </div>
      </>
    );
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
