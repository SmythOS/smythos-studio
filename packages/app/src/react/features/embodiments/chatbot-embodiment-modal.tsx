import { ArrowRightIcon } from '@radix-ui/react-icons';
import { Workspace } from '@src/builder-ui/workspace/Workspace.class';
import { useQuery } from '@tanstack/react-query';
import React, { useRef, useState } from 'react';
import { Button } from '../../shared/components/ui/newDesign/button';
import { Spinner } from '../../shared/components/ui/spinner';
import ModalHeaderEmbodiment from './modal-header-embodiment';

declare const workspace: Workspace;

/**
 * Safely checks if workspace is available and defined.
 * @returns {Workspace | null} The workspace object if available, null otherwise.
 */
const getWorkspace = (): Workspace | null => {
  try {
    return typeof workspace !== 'undefined' ? workspace : null;
  } catch {
    return null;
  }
};

/**
 * Extracts agent ID from the current context - either from workspace or URL.
 * @returns {string | null} The agent ID if found, null otherwise.
 */
const getAgentId = (): string | null => {
  // First try to get from workspace (when in builder context)
  const safeWorkspace = getWorkspace();
  if (safeWorkspace?.agent?.id) {
    return safeWorkspace.agent.id;
  }

  // Fallback: extract from URL path (when in agent settings page)
  // URL pattern: /agent-settings/{agentId}
  const pathSegments = window.location.pathname.split('/');
  const agentSettingsIndex = pathSegments.findIndex((segment) => segment === 'agent-settings');

  if (agentSettingsIndex !== -1 && pathSegments[agentSettingsIndex + 1]) {
    return pathSegments[agentSettingsIndex + 1];
  }

  return null;
};

/**
 * Custom hook to fetch the latest deployment for the current agent.
 * Works both in builder context (with workspace) and agent settings page (from URL).
 * @returns {object} Query result containing deployment data and loading state.
 */
const useLatestDeployment = () => {
  const agentId = getAgentId();

  return useQuery({
    queryKey: ['latest_deployment', agentId],
    queryFn: async () => {
      if (!agentId) {
        throw new Error('No agent ID available from workspace or URL');
      }

      const response = await fetch(`/api/page/builder/ai-agent/${agentId}/deployments/latest`);
      if (!response.ok) {
        throw new Error('Failed to fetch latest deployment');
      }

      return response.json();
    },
    enabled: Boolean(agentId),
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

/**
 * Custom hook to fetch agent data when not available from workspace.
 * @returns {object} Query result containing agent data including domain.
 */
const useAgentData = () => {
  const agentId = getAgentId();
  const safeWorkspace = getWorkspace();

  return useQuery({
    queryKey: ['agent_data', agentId],
    queryFn: async () => {
      if (!agentId) {
        throw new Error('No agent ID available');
      }

      const response = await fetch(`/api/page/builder/ai-agent/${agentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch agent data');
      }

      return response.json();
    },
    enabled: Boolean(agentId) && !safeWorkspace?.agent?.id, // Only fetch if workspace is not available
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 10 * 60 * 1000, // Consider data stale after 10 minutes
    cacheTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });
};

/**
 * Props for the ChatbotEmbodimentModal component.
 */
export interface ChatbotEmbodimentModalProps {
  /**
   * Callback to close the modal (also used for back button).
   */
  onClose: () => void;
  /**
   * Domain for the chatbot integration.
   */
  domain?: string;
  /**
   * Embodiment data containing configuration settings.
   */
  embodimentData?: {
    properties: {
      introMessage?: string;
      isFullScreen?: boolean;
      allowFileAttachments?: boolean;
    };
  };
  /**
   * Loading state while embodiment data is being fetched.
   */
  isLoading?: boolean;
}

/**
 * Chatbot Modal for showing Chatbot integration instructions or status.
 * Matches the design and UX of LLM/GPT/Alexa modals.
 *
 * @param {ChatbotEmbodimentModalProps} props - The component props.
 * @returns {JSX.Element} The rendered modal.
 */
const ChatbotEmbodimentModal: React.FC<ChatbotEmbodimentModalProps> = ({
  onClose,
  domain = 'your-domain.com',
  embodimentData,
  isLoading = false,
}) => {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Get deployment status and agent data using custom query hooks.
   */
  const latestDeploymentQuery = useLatestDeployment();
  const agentDataQuery = useAgentData();
  const safeWorkspace = getWorkspace();

  if (typeof onClose !== 'function') {
    throw new Error('ChatbotEmbodimentModal: onClose prop must be a function');
  }

  // Determine the actual domain to use - fallback to agent data if prop domain is default/invalid
  const actualDomain = (() => {
    // If domain prop is provided and not the default fallback, use it
    if (domain && domain !== 'your-domain.com') {
      return domain;
    }

    // Try to get domain from agent data (when in agent settings page)
    if (agentDataQuery?.data?.agent?.domain) {
      return agentDataQuery.data.agent.domain;
    }

    // Try to get domain from workspace (when in builder)
    if (safeWorkspace?.agent?.domain) {
      return safeWorkspace.agent.domain;
    }

    // Fallback to the prop domain (might be the default)
    return domain;
  })();

  /**
   * Ensures domain has proper protocol prefix.
   * @param {string} domain - The domain to format.
   * @returns {string} The formatted domain with protocol.
   */
  const getFullDomain = (domain: string): string => {
    // Check if the domain already includes http:// or https://
    if (!/^https?:\/\//i.test(domain)) {
      // Assume HTTPS by default
      return `https://${domain}`;
    }
    return domain;
  };

  const isFullScreen = embodimentData?.properties?.isFullScreen;
  const allowFileAttachments = embodimentData?.properties?.allowFileAttachments;
  const isUsingFullScreen = Boolean(isFullScreen);

  /**
   * Checks if the agent is deployed by verifying if there's a latest deployment.
   * @returns {boolean} True if agent is deployed, false otherwise.
   */
  const isAgentDeployed = Boolean(
    latestDeploymentQuery?.data?.deployment && !latestDeploymentQuery?.isLoading,
  );

  const chatbotContainer = `
  <div id="smythos-chatbot-container"></div>
  <!-- Chatbot Container: You can place it anywhere you want and style it as needed -->
  `;

  const codeSnippet = `${isUsingFullScreen ? chatbotContainer : ''}
    <script src="${getFullDomain(actualDomain)}/static/embodiment/chatBot/chatbot-v2.js"></script>
    <script>
        ChatBot.init({
            domain: '${actualDomain}',
            isChatOnly: ${isUsingFullScreen},
            ${isUsingFullScreen ? 'containerId: "smythos-chatbot-container",' : ''}
            allowAttachments: ${allowFileAttachments || false},
            // ... additional settings ...
            introMessage: '${
              embodimentData?.properties?.introMessage || 'Hello, how can I assist you today?'
            }',
            // ... colors settings go here ...
        });
    </script>`;

  /**
   * Handles copying the code snippet to clipboard.
   */
  const handleCopyClick = async (): Promise<void> => {
    try {
      if (textareaRef.current) {
        textareaRef.current.select();
        await navigator.clipboard.writeText(codeSnippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy code snippet:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-lg w-full p-6 flex flex-col gap-4 overflow-auto max-h-[90vh] max-w-[520px]">
        {/* Header with back and close buttons */}
        <ModalHeaderEmbodiment
          title="Chatbot Integration Snippet"
          onBack={onClose}
          onClose={onClose}
        />

        {/* Content */}

        <div className="flex flex-col gap-4">
          {isLoading ? (
            /* Loading state */
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Spinner size="lg" />
              <p className="text-sm text-gray-600">Loading chatbot configuration...</p>
            </div>
          ) : (
            <>
              {/* Instructions */}
              <div className="text-sm text-gray-700">
                <p>
                  {!isUsingFullScreen ? (
                    <>
                      Copy and paste this snippet into your website before the closing &lt;/body&gt;
                      tag.
                    </>
                  ) : (
                    'Place this snippet inside a container DOM element, and the chatbot will occupy the full available space within it.'
                  )}
                </p>
              </div>

              {/* Code snippet container */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-end items-center text-base -mb-2 -mt-4">
                  {isAgentDeployed ? (
                    <a
                      href={`${getFullDomain(actualDomain)}/chatBot`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="text-[#707070] flex items-center gap-1">
                        Preview <ArrowRightIcon className="w-5 h-5" />
                      </span>
                    </a>
                  ) : (
                    <span
                      className="text-gray-400 flex items-center gap-1 cursor-not-allowed tooltip-trigger relative"
                      data-tooltip={
                        actualDomain === 'your-domain.com'
                          ? 'Unable to load agent domain. Please try refreshing the page.'
                          : 'Agent needs to be deployed first to preview it.'
                      }
                      data-tooltip-position="left"
                    >
                      Preview <ArrowRightIcon className="w-5 h-5" />
                    </span>
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  readOnly
                  className="w-full h-64 p-3 text-sm text-gray-800 bg-white rounded-lg border border-gray-200 font-mono resize-none focus:outline-none focus:border-b-2 focus:border-b-blue-500 transition-colors"
                  value={codeSnippet}
                />

                {/* Copy Code button */}
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    handleClick={handleCopyClick}
                    label={copied ? 'Copied' : 'Copy Code'}
                    aria-label={copied ? 'Copied' : 'Copy code'}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatbotEmbodimentModal;
