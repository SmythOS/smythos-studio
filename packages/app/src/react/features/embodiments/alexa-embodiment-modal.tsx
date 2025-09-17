import { builderStore } from '@src/shared/state_stores/builder/store';
import { ArrowRightIcon } from 'lucide-react';
import React, { useState } from 'react';
import { CheckIcon, CopyIcon } from '../../shared/components/svgs';
import { Input } from '../../shared/components/ui/input';
import ModalHeaderEmbodiment from './modal-header-embodiment';

/**
 * Props for the VoiceEmbodimentModal component.
 */
interface VoiceEmbodimentModalProps {
  /**
   * Callback to close the modal (also used for back button).
   */
  onClose: () => void;
  /**
   * Domain for the Voice integration.
   */
  domain: string;
}

/**
 * Voice Integration Modal for showing step-by-step instructions and Dev/Prod URLs.
 * Matches the design and UX of Custom GPT Modal.
 *
 * @param {VoiceEmbodimentModalProps} props - The component props.
 * @returns {JSX.Element} The rendered modal.
 */
const VoiceEmbodimentModal: React.FC<VoiceEmbodimentModalProps> = ({
  onClose,
  domain = 'your-domain.com',
}) => {
  const [copied, setCopied] = useState({
    voice: false,
    alexaDev: false,
    alexaProd: false,
  });

  // Get agent domains and scheme from builderStore
  const { dev: devDomain, prod: prodDomain, scheme } = builderStore.getState().agentDomains;

  // Calculate Dev and Prod URLs (same pattern as agent-settings)
  const devUrl = devDomain && scheme ? `${scheme}://${devDomain}/alexa` : '';
  const prodUrl = prodDomain && scheme ? `${scheme}://${prodDomain}/alexa` : '';

  /**
   * Copies the given text to clipboard.
   * @param {string} text - The text to copy.
   */
  const handleCopy = (text: string, type: 'voice' | 'alexaDev' | 'alexaProd'): void => {
    setCopied({ ...copied, [type]: true });
    void navigator.clipboard.writeText(text);
    setTimeout(() => {
      setCopied({ ...copied, [type]: false });
    }, 2000);
  };

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

  const codeSnippet = `<script src="${getFullDomain(domain)}/static/embodiment/voice/voice-embodiment-minified.js">
  </script>
  <script>
        VoiceEmbodiment.init({
            domain: '${domain}',
        });
  </script>`;

  const previewUrl = `${getFullDomain(domain)}/emb/voice`;

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-lg w-full p-6 flex flex-col overflow-auto max-h-[90vh] max-w-[480px]">
        {/* Header with back and close buttons */}
        <ModalHeaderEmbodiment
          title="Voice and Alexa Integration"
          onBack={onClose}
          onClose={onClose}
        />

        {codeSnippet && (
          <>
            <div className="flex items-center justify-between mt-4">
              <label className="block text-base font-semibold text-gray-700">
                Voice Integration
              </label>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[13px] text-[#707070]"
              >
                Preview <ArrowRightIcon className="w-4 h-4" />
              </a>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 my-2 mb-4">
              <p className="text-amber-800 text-xs">
                <strong>Note:</strong> To use voice embodiment, you need to provide personal OpenAI
                API key via{' '}
                <a href="/vault" target="_blank" rel="noopener noreferrer" className="underline">
                  Vault
                </a>
                .
              </p>
            </div>
            <label htmlFor="code-snippet" className="text-sm text-gray-900">
              Code Snippet
            </label>
            <p className="text-sm text-gray-700 my-2">
              To integrate voice embodiment, copy and paste this snippet into your website before
              the closing <code>&lt;/body&gt;</code> tag.
            </p>
            <div className="relative flex items-center mt-1 group w-full">
              <textarea
                id="code-snippet"
                readOnly
                className="w-full h-40 p-3 text-sm text-[#707070] bg-white rounded-lg border border-gray-200 font-mono resize-none focus:outline-none focus:border-b-2 focus:border-b-blue-500 transition-colors"
                value={codeSnippet}
              />
              <button
                type="button"
                aria-label="Copy Voice Integration"
                onClick={() => handleCopy(codeSnippet, 'voice')}
                className={`absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 ${copied.voice ? 'opacity-100' : ''}`}
                tabIndex={-1}
              >
                {copied.voice ? <CheckIcon fill="#222" /> : <CopyIcon color="#222" />}
              </button>
            </div>
          </>
        )}

        <hr className="my-4" />
        <label className="block text-base font-semibold text-gray-700 mb-2">
          Alexa Integration
        </label>
        {/* Description */}
        <p className="text-sm text-gray-700 mb-4">
          Publish your agent as an Alexa Skill. You can publish your skill to the Alexa Skill Store
          or use it in your own Alexa devices.
        </p>

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

export default VoiceEmbodimentModal;
