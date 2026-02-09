import {
  ArrowLeftIcon,
  Chats,
  Footer,
  Header,
  LoadingSkeleton
} from '@react/features/ai-chat/components';
import { DEFAULT_AVATAR_URL } from '@react/features/ai-chat/constants';
import { useChatStores } from '@react/features/ai-chat/hooks';
import { useNavigate } from 'react-router-dom';

/**
 * Handles conditional rendering based on page state
 * Renders appropriate UI for loading, auth, disabled, or ready states
 */
export const ChatContent = () => {
  const { pageState, agent } = useChatStores();
  const navigate = useNavigate();

  // Loading state
  if (pageState === 'loading') return <LoadingSkeleton />;

  // Chatbot disabled
  if (pageState === 'disabled') {
    const agentName = agent?.data?.name || 'Agent';
    const agentAvatar = agent?.settings?.avatar || DEFAULT_AVATAR_URL;

    return (
      <div className="w-full h-full flex flex-col">
        {/* Minimal header with back button */}
        <div className="w-full max-w-4xl mx-auto flex items-center py-4 px-4">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="size-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Disabled message - centered card */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            {/* Agent Avatar */}
            <div className="mx-auto w-20 h-20 rounded-2xl overflow-hidden mb-6 shadow-lg ring-4 ring-slate-100">
              <img src={agentAvatar} alt={agentName} className="w-full h-full object-cover" />
            </div>

            {/* Agent name */}
            <h2 className="text-xl font-semibold text-slate-800 mb-2">{agentName}</h2>

            {/* Status badge */}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Chat Disabled
            </span>

            {/* Description */}
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              The chat feature is currently disabled for this agent.
            </p>

            {/* Action hint */}
            <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-slate-600 text-xs">
                Enable in{' '}
                <span className="font-medium">Agent Settings → Deployments → Chatbot</span>
              </p>
            </div>
          </div>
        </div>
      </div>
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
