import ResponseJsonViewer from '@react/features/agent-settings/components/CapabilitiesWidget/meta/ResponseJsonViewer';
import Modal from '@react/shared/components/ui/modals/Modal';
import { CustomCellRendererProps } from 'ag-grid-react';
import { isEmpty } from 'lodash-es';
import React, { lazy, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaExpand } from 'react-icons/fa';

const SyntaxHighlighter = lazy(() => import('react-syntax-highlighter/dist/esm/prism'));

type Props = CustomCellRendererProps & { isRunning: boolean };

function ResponseCellRenderer(params: Props) {
  const [isViewingResponse, setIsViewingResponse] = useState(false);
  const [copied, setCopied] = React.useState(false);
  
  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => {
        setCopied(false);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [copied]);

  const isNonEmpty = !isEmpty(params.value);

  /**
   * Converts any input to a compact JSON string without formatting
   * @param value - The value to stringify
   */
  const toCompactJson = (value: unknown): string => {
    try {
      if (typeof value === 'string') {
        // First, try to parse the string multiple times in case it's double-encoded
        let parsed = value;
        while (typeof parsed === 'string') {
          try {
            const temp = JSON.parse(parsed);
            if (typeof temp === 'string') {
              parsed = temp;
            } else {
              parsed = temp;
              break;
            }
          } catch {
            break;
          }
        }
        
        // Now stringify the final parsed value
        return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
      }
      return JSON.stringify(value);
    } catch {
      // If parsing fails, return the original value as is
      return typeof value === 'string' ? value : JSON.stringify(value);
    }
  };

  const preparedResponse = isNonEmpty
    ? toCompactJson(params.value).substring(0, 100)
    : null;
  return (
    <>
      {!params.value && <p className="text-gray-400">Output</p>}
      {params.value && (
        <div className="flex items-center gap-2">
          {!params.isRunning && (
            <FaExpand
              onClick={() => setIsViewingResponse(true)}
              color="#45c9a9"
              cursor={'pointer'}
              className="min-w-[17px] h-[17px]"
            />
          )}
          <p>{preparedResponse}</p>
          {/* <div className="absolute top-1 right-1 group-hover:opacity-100 opacity-0 transition-opacity duration-300">
                        <Tooltip content={copied ? 'Copied!' : 'Copy'} placement="top" className="z-50">
                            <FaRegCopy
                                cursor={'pointer'}
                                onClick={() => {
                                    navigator.clipboard.writeText(isStringified ? params.value : JSON.stringify(params.value, null, 2));
                                    setCopied(true);
                                }}
                            />
                        </Tooltip>
                    </div> */}
        </div>
      )}
      {isViewingResponse &&
        params.value &&
        createPortal(
          <Modal
            onClose={() => setIsViewingResponse(false)}
            title={'Response'}
            panelWrapperClasses="lg:w-[35vw] md:w-[40vw]"
            applyMaxWidth={false}
          >
            <ResponseJsonViewer
              isStringified
              SyntaxHighlighter={SyntaxHighlighter}
              response={JSON.parse(params.value)}
            />
          </Modal>,
          document.body,
        )}
    </>
  );
}

export default ResponseCellRenderer;
