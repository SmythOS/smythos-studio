import { builderStore } from '@src/shared/state_stores/builder/store';
import { ArrowRightIcon } from 'lucide-react';
import React, { useState } from 'react';
import { CheckIcon, CopyIcon } from '../../shared/components/svgs';
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
   * Agent domains for the Voice integration.
   */
  agentDomains?: {
    dev: string;
    prod: string;
    scheme: string;
  };
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
  agentDomains,
}) => {
  const [copied, setCopied] = useState({
    voice: false,
  });

  // Get agent domains and scheme from builderStore
  const {
    dev: devDomain,
    prod: prodDomain,
    scheme,
  } = agentDomains || builderStore.getState().agentDomains;

  const voiceDevUrl = devDomain && scheme ? `${scheme}://${devDomain}` : '';
  const voiceProdUrl = prodDomain && scheme ? `${scheme}://${prodDomain}` : '';

  /**
   * Copies the given text to clipboard.
   * @param {string} text - The text to copy.
   */
  const handleCopy = (text: string, type: 'voice'): void => {
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

  const codeSnippet = `<script src="${getFullDomain(voiceProdUrl || voiceDevUrl)}/static/embodiment/voice/voice-embodiment-minified.js">
  </script>
  <script>
        VoiceEmbodiment.init({
            domain: '${voiceProdUrl || voiceDevUrl}?type=widget',
        });
  </script>`;

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-lg w-full p-6 flex flex-col overflow-auto max-h-[90vh] max-w-[480px]">
        {/* Header with back and close buttons */}
        <ModalHeaderEmbodiment
          title="Voice Integration"
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
                href={`${voiceProdUrl || voiceDevUrl}/emb/voice`}
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
                className="w-full h-72 p-3 text-sm text-[#707070] bg-white rounded-lg border border-gray-200 font-mono resize-none focus:outline-none focus:border-b-2 focus:border-b-blue-500 transition-colors"
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
      </div>
    </div>
  );
};

export default VoiceEmbodimentModal;
