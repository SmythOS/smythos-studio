import PreviewableAsset from '@src/react/features/builder/components/endpoint-form-preview-sidebar/PreviewableAsset';
import { useEndpointFormPreview } from '@src/react/features/builder/contexts/endpoint-form-preview-sidebar.context';
import { TextArea } from '@src/react/shared/components/ui/newDesign/textarea';
import { FEATURE_FLAGS } from '@src/shared/constants/featureflags';
import { PostHog } from '@src/shared/posthog';
import classNames from 'classnames';
import { useMemo, useRef, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { FaRegCopy } from 'react-icons/fa6';
import { FiDownload } from 'react-icons/fi';

const TEST_FORM_TRY_DEBUG_BUTTON_EXPERIMENT_VARIANTS = {
  CONTROL: 'control',
  VARIANT_1: 'variant_1',
} as const;

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

  const handleDebugClick = async () => {
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
  };

  const ControlDebugMessage = () => (
    <>
      Something went wrong? try{' '}
      <span
        className="font-semibold border-b border-solid pb-0.5 cursor-pointer text-blue-500 border-blue-500"
        onClick={() => {
          PostHog.track('debug_api_modal_opened_test_as_form', {
            source: 'test_as_form',
            variant: 'control',
          });
          handleDebugClick();
        }}
      >
        debugging
      </span>{' '}
      to fix errors.
    </>
  );

  const VariantDebugButton = () => (
    <div className="text-right">
      <button
        className="font-semibold cursor-pointer text-blue-500 bg-transparent hover:text-smythos-blue focus:outline-none py-2 rounded-lg text-sm transition-colors"
        onClick={() => {
          PostHog.track('debug_api_modal_opened_test_as_form', {
            source: 'test_as_form',
            variant: 'variant_1',
          });
          handleDebugClick();
        }}
      >
        Something went wrong? Try Debugging{' '}
        <span
          className="transition-transform duration-300"
          style={{ transform: 'translateX(10px)' }}
        >
          -&gt;
        </span>
      </button>
    </div>
  );

  const getDebugComponent = () => {
    try {
      const featureVariant = PostHog.getFeatureFlag(
        FEATURE_FLAGS.TEST_FORM_TRY_DEBUG_BUTTON_EXPERIMENT,
      ) as string;

      return featureVariant === TEST_FORM_TRY_DEBUG_BUTTON_EXPERIMENT_VARIANTS.VARIANT_1 ? (
        <VariantDebugButton />
      ) : (
        <ControlDebugMessage />
      );
    } catch (error) {
      console.error('Error in TEST_FORM_TRY_DEBUG_BUTTON_EXPERIMENT: ', error.toString());
      return <ControlDebugMessage />;
    }
  };

  const [isCopied, setIsCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const DEBUG_SERVER = mode.props.dbg_url;

  // TextArea component now handles auto-grow with maxHeight prop
  // Removed redundant useEffect that conflicted with TextArea's internal logic

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
                  <TextArea
                    ref={textareaRef}
                    readOnly
                    className="text-gray-800 resize-none"
                    defaultValue={seralizeResponse(lastResponse?.response)}
                    rows={10}
                    maxHeight={220}
                    autoGrow={true}
                    fullWidth
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
        <div className="py-4 text-gray-500">{getDebugComponent()}</div>
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
