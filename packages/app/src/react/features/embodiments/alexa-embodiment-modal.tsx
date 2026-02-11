import { builderStore } from '@src/shared/state_stores/builder/store';
import React, { useState } from 'react';
import { CheckIcon, CopyIcon } from '../../shared/components/svgs';
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
  /**
   * Agent domains for the Alexa integration.
   */
  agentDomains?: {
    dev: string;
    prod: string;
    scheme: string;
  };
}

/**
 * Alexa Integration Modal for showing step-by-step instructions and Dev/Prod URLs.
 *
 * @param {AlexaEmbodimentModalProps} props - The component props.
 * @returns {JSX.Element} The rendered modal.
 */
const AlexaEmbodimentModal: React.FC<AlexaEmbodimentModalProps> = ({
  onClose,
  agentDomains,
}) => {
  const [copied, setCopied] = useState({
    alexaDev: false,
    alexaProd: false,
  });

  // Get agent domains and scheme from builderStore
  const {
    dev: devDomain,
    prod: prodDomain,
    scheme,
  } = agentDomains || builderStore.getState().agentDomains;

  // Calculate Dev and Prod URLs (same pattern as agent-settings)
  const devUrl = devDomain && scheme ? `${scheme}://${devDomain}/alexa` : '';
  const prodUrl = prodDomain && scheme ? `${scheme}://${prodDomain}/alexa` : '';

  /**
   * Copies the given text to clipboard.
   * @param {string} text - The text to copy.
   */
  const handleCopy = (text: string, type: 'alexaDev' | 'alexaProd'): void => {
    setCopied({ ...copied, [type]: true });
    void navigator.clipboard.writeText(text);
    setTimeout(() => {
      setCopied({ ...copied, [type]: false });
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-lg w-full p-6 flex flex-col overflow-auto max-h-[90vh] max-w-[480px]">
        {/* Header with back and close buttons */}
        <ModalHeaderEmbodiment
          title="Alexa Integration"
          onBack={onClose}
          onClose={onClose}
        />
        {/* Dev URL */}
        {devUrl && (
          <>
            <div className="text-sm text-gray-900">Alexa Dev URL</div>
            <div className="relative flex items-center my-1 mb-2 group w-full">
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
                onClick={() => handleCopy(devUrl, 'alexaDev')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 ${copied.alexaDev ? 'opacity-100' : ''}`}
                tabIndex={-1}
              >
                {copied.alexaDev ? <CheckIcon fill="#222" /> : <CopyIcon color="#222" />}
              </button>
            </div>
          </>
        )}

        {/* Prod URL */}
        {prodUrl && (
          <>
            <div className="text-sm text-gray-900">Alexa Prod URL</div>
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
                onClick={() => handleCopy(prodUrl, 'alexaProd')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 ${copied.alexaProd ? 'opacity-100' : ''}`}
                tabIndex={-1}
              >
                {copied.alexaProd ? <CheckIcon fill="#222" /> : <CopyIcon color="#222" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AlexaEmbodimentModal;
