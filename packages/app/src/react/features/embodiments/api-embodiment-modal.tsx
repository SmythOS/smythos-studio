import { builderStore } from '@src/shared/state_stores/builder/store';
import { delay } from '@src/shared/utils';
import React, { useEffect, useRef, useState } from 'react';
import { EmbodimentRPCManager } from '../../../shared/services/embodiment_rpc_manager';
import { CopyIcon } from '../../shared/components/svgs';
import { Input } from '../../shared/components/ui/input';
import ModalHeaderEmbodiment from './modal-header-embodiment';

/**
 * Props for the ApiEmbodimentModal component.
 */
export interface ApiEmbodimentModalProps {
  /**
   * Callback to close the modal (also used for back button).
   */
  onClose: () => void;
}

/**
 * API Endpoints Modal for showing the Swagger UI in an iframe.
 * Matches the design and UX of other integration modals.
 *
 * @param {ApiEmbodimentModalProps} props - The component props.
 * @returns {JSX.Element} The rendered modal.
 */
const ApiEmbodimentModal: React.FC<ApiEmbodimentModalProps> = ({ onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Get agent domains and scheme from builderStore (same pattern as agent-settings)
  const { dev: devDomain, prod: prodDomain, scheme } = builderStore.getState().agentDomains;

  // Calculate Swagger URL (same pattern as agent-settings)
  const swaggerUrl = devDomain && scheme ? `${scheme}://${devDomain}/swagger` : '';
  const swaggerUrlProd = prodDomain && scheme ? `${scheme}://${prodDomain}/swagger` : '';

  /**
   * Copies the given text to clipboard.
   * @param {string} text - The text to copy.
   */
  const handleCopy = (text: string): void => {
    void navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !swaggerUrl) return;

    const handleLoad = async () => {
      setIsLoading(false);

      await delay(200);

      // Send RPC message like in agent-settings
      EmbodimentRPCManager.send(
        {
          function: 'attachHeaders',
          args: [{ 'X-MONITOR-ID': (window as any).currentMonitorId }],
        },
        ['swagger'],
      );
    };

    iframe.addEventListener('load', handleLoad);

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [swaggerUrl]);

  return (
    <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-2xl shadow-lg w-full p-6 flex flex-col gap-4 overflow-auto max-h-[90vh] max-w-[800px]">
        {/* Header with back and close buttons */}
        <ModalHeaderEmbodiment title="API Endpoints" onBack={onClose} onClose={onClose} />

        {/* Description */}
        <div>
          <p className="text-sm text-gray-700">
            Enable Agent to communicate with each other using a set of definitions and protocols.
          </p>
        </div>

        {/* Dev API URL */}
        {swaggerUrl && (
          <>
            <div className="text-sm text-gray-900 -mb-4">Dev API</div>
            <div className="relative flex items-center mt-1 group w-full">
              <Input
                type="text"
                value={swaggerUrl}
                readOnly
                fullWidth
                className="w-full border-[#D1D5DB] border-b-gray-900 text-xs text-gray-700 hover:pr-10"
                aria-label="Dev API URL"
              />
              <button
                type="button"
                aria-label="Copy Dev API URL"
                onClick={() => handleCopy(swaggerUrl)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1"
                tabIndex={-1}
              >
                <CopyIcon color="#222" />
              </button>
            </div>
          </>
        )}

        {/* Prod API URL */}
        {swaggerUrlProd && (
          <>
            <div className="text-sm text-gray-900 -mb-4">Prod API</div>
            <div className="relative flex items-center mt-1 group w-full">
              <Input
                type="text"
                value={swaggerUrlProd}
                readOnly
                fullWidth
                className="w-full border-[#D1D5DB] border-b-gray-900 text-xs text-gray-700 hover:pr-10"
                aria-label="Prod API URL"
              />
              <button
                type="button"
                aria-label="Copy Prod API URL"
                onClick={() => handleCopy(swaggerUrlProd)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1"
                tabIndex={-1}
              >
                <CopyIcon color="#222" />
              </button>
            </div>
          </>
        )}

        {/* Content area with spinner and iframe */}
        <div className="relative" style={{ minHeight: '500px' }}>
          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div role="status">
                <svg
                  className="w-8 h-8 animate-spin"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="10" stroke="#0366d6" strokeWidth="4" fill="none" />
                  <path
                    fill="none"
                    stroke="white"
                    strokeWidth="4"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          )}

          {/* Iframe */}
          {swaggerUrl && (
            <iframe
              ref={iframeRef}
              src={swaggerUrl}
              className="w-full border-0"
              style={{
                height: '500px',
                display: isLoading ? 'none' : 'block',
              }}
              title="API Endpoints - Swagger UI"
            />
          )}

          {/* No domain message */}
          {!swaggerUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-base text-gray-700">
                Agent domain is not set. Cannot provide API features.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiEmbodimentModal;
