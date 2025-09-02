import { ArrowRightIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../shared/components/ui/newDesign/button';
import { Spinner } from '../../shared/components/ui/spinner';
import ModalHeaderEmbodiment from './modal-header-embodiment';

// Import the useAgent hook for fallback when workspace is not available
import { useAgent } from '../../shared/hooks/agent';

/**
 * Simple hook to get agent components data
 * Uses workspace if available, otherwise falls back to API
 */
const useAgentComponentsData = (agentId?: string) => {
  // Try to get data from workspace first (builder context)
  const workspaceData = window.workspace?.agent?.data;

  // Fallback to API if no workspace data and agentId provided
  const { data: apiData, isLoading } = useAgent(agentId || '', {
    enabled: !!agentId && !workspaceData,
    refetchOnWindowFocus: false,
  });

  // Use workspace data if available, otherwise use API data
  const agentData = workspaceData || apiData?.data;

  return {
    components:
      agentData?.components?.filter(
        (component: any) =>
          component.inputs && component.inputs.length > 0 && component.data?.endpoint,
      ) || [],
    isLoading: !workspaceData && isLoading,
  };
};

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
  /**
   * Agent ID to fetch components data for (optional, will use workspace if available)
   */
  agentId?: string;
}

/**
 * Form Preview Modal for showing Form Preview integration instructions or status.
 * Matches the design and UX of LLM/GPT/Alexa modals.
 *
 * Usage examples:
 * - From builder context: <FormEmbodimentModal onClose={handleClose} />
 * - From agent settings: <FormEmbodimentModal onClose={handleClose} agentId="agent-123" />
 *
 * @param {FormEmbodimentModalProps} props - The component props.
 * @returns {JSX.Element} The rendered modal.
 */
const FormEmbodimentModal: React.FC<FormEmbodimentModalProps> = ({
  onClose,
  domain = 'your-domain.com',
  isLoading = false,
  showBackButton = true,
  agentId: propAgentId,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get agent components data (from workspace or API)
  const { components, isLoading: isComponentsLoading } = useAgentComponentsData(propAgentId);

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

  const codeSnippet = `<script src="${getFullDomain(domain)}/static/embodiment/formPreview/form-preview-minified.js">
</script>
<script>
      FormPreview.init({
          domain: '${domain}?endpointId=${selectedEndpoint}',
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

  useEffect(() => {
    if (components.length > 0 && !selectedEndpoint) {
      setSelectedEndpoint(components[0].id);
    }
  }, [components, selectedEndpoint]);

  const previewUrl = `${getFullDomain(domain)}/form-preview?endpointId=${selectedEndpoint}`;

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-lg w-full p-6 flex flex-col overflow-auto max-h-[90vh] max-w-[520px]">
        {/* Header with back and close buttons */}
        <ModalHeaderEmbodiment
          title="Form Preview Integration Snippet"
          onBack={onClose}
          onClose={onClose}
          showBackButton={showBackButton}
        />

        {/* Content */}
        {isLoading || isComponentsLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : components.length > 0 ? (
          <div className="flex flex-col">
            {/* Instructions */}
            <div className="text-sm text-gray-700">
              <p>
                Copy and paste this snippet into your website before the closing &lt;/body&gt; tag.
              </p>

              {/* API Endpoints Dropdown */}
              <div className="mb-2 mt-6 flex justify-between items-center text-base">
                <label htmlFor="api-endpoint" className="block font-semibold text-gray-700">
                  Select A Form
                </label>
                <a href={previewUrl} target="_blank">
                  <span className="text-[#707070] flex items-center gap-1">
                    Preview <ArrowRightIcon className="w-5 h-5" />
                  </span>
                </a>
              </div>
              <div className="">
                <select
                  id="api-endpoint"
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedEndpoint}
                  onChange={(e) => setSelectedEndpoint(e.target.value)}
                >
                  <option value="" disabled>
                    Choose an API endpoint...
                  </option>
                  {components.map((component: any) => (
                    <option key={component.id} value={component.id}>
                      {component.title || component.name || 'Unnamed API Endpoint'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Code snippet container */}
            <label
              htmlFor="code-snippet"
              className="block text-base font-semibold text-gray-700 my-2 mt-4"
            >
              Code Snippet
            </label>
            <div className="flex flex-col gap-4">
              <textarea
                id="code-snippet"
                ref={textareaRef}
                readOnly
                className="w-full h-64 p-3 text-sm text-[#707070] bg-white rounded-lg border border-gray-200 font-mono resize-none focus:outline-none focus:border-b-2 focus:border-b-blue-500 transition-colors"
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
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <p className="text-sm text-gray-600">No API endpoints found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FormEmbodimentModal;
