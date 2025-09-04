import PreviewableAsset from '@src/react/features/builder/components/endpoint-form-preview-sidebar/PreviewableAsset';
import { useEndpointFormPreview } from '@src/react/features/builder/contexts/endpoint-form-preview-sidebar.context';
import classNames from 'classnames';
import { Textarea } from 'flowbite-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { FaRegCopy } from 'react-icons/fa6';
import { FiDownload } from 'react-icons/fi';

const ResponseView = () => {
  const {
    callSkillMutation,
    lastFormValues,
    abortController,
    lastResponse,
    mode,
    agentSkillErrors,
    selectedSkill,
  } = useEndpointFormPreview();

  const [isCopied, setIsCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const DEBUG_SERVER = mode.props.dbg_url;

  useEffect(() => {
    if (textareaRef.current) {
      // adjust the height of the textarea to the content
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 400) + 'px';
    }
  }, [textareaRef]);

  const extractPreviewableAssets = (content: string) => {
    const pattern =
      /\b(?:https?|ftp):\/\/[^\s/$.?#].[^\s]*(?:\.(?:jpg|jpeg|png|gif|bmp|webp|svg|mp3|wav|flac|aac|mp4|mkv|mov|avi|webm|ogg|m4a|m4v|m3u8|ts|wmv))(?:\?[^\s"']*)?\b|\bsmythfs:\/\/[^\s/$.?#].[^\s"']*\b/g;
    const matches =
      content
        .match(pattern)
        ?.map((m) => m.trim())
        ?.map((m) => (m.startsWith('smythfs://') ? `${DEBUG_SERVER}/file-proxy?url=${m}` : m)) ||
      [];
    return [...new Set(matches)];
  };

  function seralizeResponse(response: any) {
    return typeof response === 'string' ? response : JSON.stringify(response, null, 2);
  }

  const previewableAssets = useMemo(
    () =>
      lastResponse?.response
        ? extractPreviewableAssets(seralizeResponse(lastResponse?.response))
        : [],
    [lastResponse],
  );

  const handleDownload = () => {
    // convert the text to a file
    const blob = new Blob([lastResponse?.response], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.txt';
    a.click();
  };

  return (
    <div>
      {callSkillMutation.isLoading && (
        // option to cancel the request
        <button
          onClick={() => {
            abortController.current?.abort();
          }}
          className="bg-transparent font-bold border border-gray-300 text-gray-500 px-4 py-3 rounded-md w-full mt-4"
        >
          Stop Testing
        </button>
      )}

      {agentSkillErrors.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          {agentSkillErrors.map((error) => (
            <div className="text-gray-500" key={error.error_slug}>
              {error.error_message}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        {lastResponse && (
          <div>
            <h3 className="font-semibold">Agent Output</h3>
            <div className="text-sm">
              <div>
                {previewableAssets.map((asset) => (
                  <PreviewableAsset key={asset} asset={asset} />
                ))}
                <div className="mt-5 relative">
                  <Textarea
                    ref={textareaRef}
                    readOnly
                    className=" text-gray-800 resize-none"
                    defaultValue={seralizeResponse(lastResponse?.response)}
                    rows={10}
                  />
                  {/* )} */}
                  {/* copy and download btns */}
                  <div
                    className={classNames(
                      'absolute right-2 flex gap-2 top-2 [&:hover_actionicons]:opacity-100',
                      // stateProps.isFile ? 'top-1/2 -translate-y-1/2' : 'top-2',
                    )}
                  >
                    <span
                      onClick={handleDownload}
                      className="cursor-pointer rounded-lg p-2 h-full flex items-center text-sm border border-solid border-gray-200 bg-gray-50 text-gray-900 opacity-50 hover:opacity-100"
                    >
                      <FiDownload />
                    </span>
                    <span
                      onClick={() => {
                        navigator.clipboard.writeText(seralizeResponse(lastResponse?.response));
                        setIsCopied(true);
                      }}
                      onMouseLeave={() => {
                        setIsCopied(false);
                      }}
                      className="cursor-pointer rounded-lg p-2 h-full flex items-center text-sm border border-solid border-gray-200 bg-gray-50 text-gray-900 opacity-50 hover:opacity-100"
                    >
                      {isCopied ? <FaCheck /> : <FaRegCopy />}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="py-4 text-gray-500">
          Something went wrong? try{' '}
          <span
            className="font-semibold border-b border-solid pb-0.5 cursor-pointer text-blue-500 border-blue-500"
            onClick={async () => {
              // Toggle debug bar
              const debugSwitcher = document.querySelector('.debug-switcher');
              // trigger click on debug bar
              if (debugSwitcher && !debugSwitcher?.classList.contains('active')) {
                debugSwitcher.dispatchEvent(new Event('click', { bubbles: true }));
              }

              // Open debug modal for the current skill
              const componentElement = document.getElementById(selectedSkill?.skillId);
              if (componentElement) {
                const component = componentElement['_control'];
                if (component && typeof component.openDebugDialog === 'function') {
                  // Fire telemetry event
                  const { PostHog } = await import('@src/shared/posthog');
                  PostHog.track('debug_modal_opened', {
                    source: 'test_as_form',
                  });

                  // Open the debug dialog with 'run' operation
                  await component.openDebugDialog(new Event('click'), 'run', lastFormValues);
                }
              }
            }}
          >
            debugging
          </span>{' '}
          to fix errors.
        </div>
        {callSkillMutation.isError && (
          <div>
            <h3 className="font-semibold">Error</h3>
            <div>
              {typeof (callSkillMutation?.error as any)?.error === 'string'
                ? (callSkillMutation?.error as any)?.error
                : 'We encountered an error while processing your request. Please try again later.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseView;
