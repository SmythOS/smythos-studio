import { Chats, Container, Footer, Header } from '@react/features/ai-chat/components';
import { AuthOverlay } from '@react/features/ai-chat/components/auth/auth-overlay';
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
    <div className="w-full max-w-4xl flex justify-between items-center pt-2">
      <div className="w-full flex items-center gap-2.5">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-0.5">
          <Skeleton className="w-32 h-4 rounded" />
          <Skeleton className="w-20 h-3 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Skeleton className="size-7 rounded-xl" />
        <Skeleton className="size-7 rounded-xl" />
      </div>
    </div>

    {/* Chat area skeleton */}
    <div className="w-full h-full flex-1" />

    <div className="w-full max-w-4xl py-4 space-y-4">
      <Skeleton className="w-full h-[124px] rounded-xl" />
      <Skeleton className="w-4/6 h-4 rounded-md mx-auto" />
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
