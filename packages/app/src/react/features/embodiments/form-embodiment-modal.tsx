import React, { useRef, useState } from 'react';
import { Button } from '../../shared/components/ui/newDesign/button';
import { Spinner } from '../../shared/components/ui/spinner';
import ModalHeaderEmbodiment from './modal-header-embodiment';

/**
 * Props for the FormEmbodimentModal component.
 */
export interface FormEmbodimentModalProps {
  /**
   * Callback to close the modal (also used for back button).
   */
  onClose: () => void;
  /**
   * Domain for the form preview integration.
   */
  domain?: string;
  /**
   * Loading state while embodiment data is being fetched.
   */
  isLoading?: boolean;
  /**
   * Whether to show the back button.
   */
  showBackButton?: boolean;
}

/**
 * Form Preview Modal for showing Form Preview integration instructions or status.
 * Matches the design and UX of LLM/GPT/Alexa modals.
 *
 * @param {FormEmbodimentModalProps} props - The component props.
 * @returns {JSX.Element} The rendered modal.
 */
const FormEmbodimentModal: React.FC<FormEmbodimentModalProps> = ({
  onClose,
  domain = 'your-domain.com',
  isLoading = false,
  showBackButton = true,
}) => {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (typeof onClose !== 'function') {
    throw new Error('FormEmbodimentModal: onClose prop must be a function');
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

  const codeSnippet = `
    <script src="${getFullDomain(domain)}/static/embodiment/formPreview/form-preview-minified.js"></script>
    <script>
        FormPreview.init({
            domain: '${domain}',
            // ... additional settings ...
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
          title="Form Preview Integration Snippet"
          onBack={onClose}
          onClose={onClose}
          showBackButton={showBackButton}
        />

        {/* Content */}
        <div className="flex flex-col gap-4">
          {isLoading ? (
            /* Loading state */
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Spinner size="lg" />
              <p className="text-sm text-gray-600">Loading form preview configuration...</p>
            </div>
          ) : (
            <>
              {/* Instructions */}
              <div className="text-sm text-gray-700">
                <p>
                  Copy and paste this snippet into your website before the closing &lt;/body&gt;
                  tag.
                </p>
              </div>

              {/* Code snippet container */}
              <div className="flex flex-col gap-4">
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
                    className="text-sm"
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

export default FormEmbodimentModal;
