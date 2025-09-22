import { ArrowRightIcon } from '@radix-ui/react-icons';
import React, { useRef, useState } from 'react';
import { Button } from '../../shared/components/ui/newDesign/button';
import { Spinner } from '../../shared/components/ui/spinner';
import { useDeploymentSidebarCtx } from '../builder/contexts/deployment-sidebar.context';
import ModalHeaderEmbodiment from './modal-header-embodiment';

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
   * Get deployment status from the existing deployment sidebar context.
   */
  const { latestDeployment } = useDeploymentSidebarCtx();

  if (typeof onClose !== 'function') {
    throw new Error('ChatbotEmbodimentModal: onClose prop must be a function');
  }

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
    latestDeployment?.data?.deployment && !latestDeployment?.isLoading,
  );

  const chatbotContainer = `
  <div id="smythos-chatbot-container"></div>
  <!-- Chatbot Container: You can place it anywhere you want and style it as needed -->
  `;

  const codeSnippet = `${isUsingFullScreen ? chatbotContainer : ''}
    <script src="${getFullDomain(domain)}/static/embodiment/chatBot/chatbot-v2.js"></script>
    <script>
        ChatBot.init({
            domain: '${domain}',
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
                <div className="flex justify-end items-center text-base -mb-4 -mt-4">
                  {isAgentDeployed ? (
                    <a
                      href={`${getFullDomain(domain)}/chatBot`}
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
                      data-tooltip="Agent needs to be deployed first to preview it."
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
