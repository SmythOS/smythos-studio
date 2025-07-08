import { EMBODIMENT_DESCRIPTIONS } from '@src/shared/constants/general';
import { builderStore } from '@src/shared/state_stores/builder/store';
import React from 'react';
import { CopyIcon } from '../../shared/components/svgs';
import { Input } from '../../shared/components/ui/input';
import ModalHeaderEmbodiment from './modal-header-embodiment';

/**
 * Props for the GptEmbodimentModal component.
 */
interface GptEmbodimentModalProps {
  /**
   * Callback to close the modal (also used for back button).
   */
  onClose: () => void;
}

/**
 * Custom GPT Modal for showing step-by-step instructions and Dev/Prod URLs.
 * Matches the design and UX of LLM Integration Modal.
 *
 * @param {GptEmbodimentModalProps} props - The component props.
 * @returns {JSX.Element} The rendered modal.
 */
const GptEmbodimentModal: React.FC<GptEmbodimentModalProps> = ({ onClose }) => {
  // Get agent domains and scheme from builderStore
  const { dev: devDomain, prod: prodDomain, scheme } = builderStore.getState().agentDomains;

  // Calculate Dev and Prod URLs
  const devUrl = devDomain && scheme ? `${scheme}://${devDomain}/api-docs/openapi-llm.json` : '';
  const prodUrl = prodDomain && scheme ? `${scheme}://${prodDomain}/api-docs/openapi-llm.json` : '';

  /**
   * Copies the given text to clipboard.
   * @param {string} text - The text to copy.
   */
  const handleCopy = (text: string): void => {
    void navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-lg w-full p-6 flex flex-col gap-4 overflow-auto max-h-[90vh] max-w-[480px]">
        {/* Header with back and close buttons */}
        <ModalHeaderEmbodiment
          title={EMBODIMENT_DESCRIPTIONS.chatgpt.title}
          onBack={onClose}
          onClose={onClose}
        />
        {/* Step-by-step instructions */}
        <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-700">
          <li>
            Click{' '}
            <a
              href="https://chat.openai.com/gpts/editor"
              target="_blank"
              rel="noopener noreferrer"
              className="text-v2-blue font-semibold underline"
            >
              Here
            </a>{' '}
            to Create a custom GPT from chatGPT interface.
          </li>
          <li>Click on "Configure" tab</li>
          <li>
            Enter your Custom GPT information: We recommend to copy the content of SmythOS Agent
            behavior inside "Instructions" area in order to have a consistent behavior
          </li>
          <li>Scroll down and Click on "Create new action" button.</li>
          <li>Click Import URL and enter the following URL:</li>
        </ol>
        {devUrl && (
          <>
            <div className="text-sm text-gray-900 -mb-4">GPT Dev URL</div>
            <div className="relative flex items-center mt-1 group w-full">
              <Input
                type="text"
                value={devUrl}
                readOnly
                fullWidth
                className="w-full border-[#D1D5DB] border-b-gray-900 text-xs text-gray-700 hover:pr-10"
                aria-label="Dev OpenAPI URL"
              />
              <button
                type="button"
                aria-label="Copy Dev OpenAPI URL"
                onClick={() => handleCopy(devUrl)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1"
                tabIndex={-1}
              >
                <CopyIcon color="#222" />
              </button>
            </div>
          </>
        )}
        {prodUrl && (
          <>
            <div className="text-sm text-gray-900 -mb-4">GPT Prod URL</div>
            <div className="relative flex items-center mt-1 group w-full">
              <Input
                type="text"
                value={prodUrl}
                readOnly
                fullWidth
                className="w-full border-[#D1D5DB] border-b-gray-900 text-xs text-gray-700 hover:pr-10"
                aria-label="Prod OpenAPI URL"
              />
              <button
                type="button"
                aria-label="Copy Prod OpenAPI URL"
                onClick={() => handleCopy(prodUrl)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1"
                tabIndex={-1}
              >
                <CopyIcon color="#222" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GptEmbodimentModal; 