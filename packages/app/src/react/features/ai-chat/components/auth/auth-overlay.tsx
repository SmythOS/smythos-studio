import { useChatStores } from '@react/features/ai-chat/hooks';
import { AUTH_METHODS } from '@react/features/ai-chat/constants';
import { OAuthOverlay } from './oauth-overlay';
import { ApiKeyOverlay } from './api-key-overlay';

/**
 * Main authentication overlay component
 * Displays the appropriate auth UI based on the configured auth method
 */
export const AuthOverlay = () => {
  const { auth, agent } = useChatStores();
  const { method } = auth;
  const agentName = agent?.data?.name;

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="bg-white text-center max-w-md w-full p-10 rounded-xl shadow-lg">
        {/* Agent Avatar */}
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-blue-600">
              {agentName?.[0]?.toUpperCase() || 'A'}
            </span>
          </div>
        </div>

        {/* Agent Name */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">{agentName || 'AI Agent'}</h2>

        {/* Powered by */}
        <p className="text-gray-400 text-sm mb-4">Powered by SmythOS</p>

        {/* Description */}
        <p className="text-gray-600 mb-8">This agent requires authentication to continue.</p>

        {/* Auth Method Specific UI */}
        {method === AUTH_METHODS.OAUTH && <OAuthOverlay />}
        {method === AUTH_METHODS.API_KEY && <ApiKeyOverlay />}
      </div>
    </div>
  );
};
