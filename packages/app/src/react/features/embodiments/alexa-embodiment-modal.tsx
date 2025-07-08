import { builderStore } from '@src/shared/state_stores/builder/store';
import React from 'react';
import { CopyIcon } from '../../shared/components/svgs';
import { Input } from '../../shared/components/ui/input';
import ModalHeaderEmbodiment from './modal-header-embodiment';

/**
 * Props for the AlexaEmbodimentModal component.
 */
interface AlexaEmbodimentModalProps {
  /**
   * Callback to close the modal (also used for back button).
   */
  onClose: () => void;
}

/**
 * Alexa Integration Modal for showing step-by-step instructions and Dev/Prod URLs.
 * Matches the design and UX of Custom GPT Modal.
 *
 * @param {AlexaEmbodimentModalProps} props - The component props.
 * @returns {JSX.Element} The rendered modal.
 */
const AlexaEmbodimentModal: React.FC<AlexaEmbodimentModalProps> = ({ onClose }) => {
  // Get agent domains and scheme from builderStore
  const { dev: devDomain, prod: prodDomain, scheme } = builderStore.getState().agentDomains;

  // Calculate Dev and Prod URLs (same pattern as agent-settings)
  const devUrl = devDomain && scheme ? `${scheme}://${devDomain}/alexa` : '';
  const prodUrl = prodDomain && scheme ? `${scheme}://${prodDomain}/alexa` : '';

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
          title="Alexa Integration"
          onBack={onClose}
          onClose={onClose}
        />

        {/* Description */}
        <p className="text-sm text-gray-700 mb-4">
          Publish your agent as an Alexa Skill. You can publish your skill to the Alexa Skill Store or use it in your own Alexa devices.
        </p>

        {/* Dev URL */}
        {devUrl && (
          <>
            <div className="text-sm text-gray-900 -mb-4">Alexa Dev URL</div>
            <div className="relative flex items-center mt-1 group w-full">
              <Input
                type="text"
                value={devUrl}
                readOnly
                fullWidth
                className="w-full border-[#D1D5DB] border-b-gray-900 text-xs text-gray-700 hover:pr-10"
                aria-label="Alexa Dev URL"
              />
              <button
                type="button"
                aria-label="Copy Alexa Dev URL"
                onClick={() => handleCopy(devUrl)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1"
                tabIndex={-1}
              >
                <CopyIcon color="#222" />
              </button>
            </div>
          </>
        )}

        {/* Prod URL */}
        {prodUrl && (
          <>
            <div className="text-sm text-gray-900 -mb-4">Alexa Prod URL</div>
            <div className="relative flex items-center mt-1 group w-full">
              <Input
                type="text"
                value={prodUrl}
                readOnly
                fullWidth
                className="w-full border-[#D1D5DB] border-b-gray-900 text-xs text-gray-700 hover:pr-10"
                aria-label="Alexa Prod URL"
              />
              <button
                type="button"
                aria-label="Copy Alexa Prod URL"
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

export default AlexaEmbodimentModal; 