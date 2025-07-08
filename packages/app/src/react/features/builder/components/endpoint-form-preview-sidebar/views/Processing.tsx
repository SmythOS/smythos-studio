import { ArrowLeftIcon } from '@radix-ui/react-icons';
import FormFill from '@src/react/features/builder/components/endpoint-form-preview-sidebar/views/FormFill';
import ResponseView from '@src/react/features/builder/components/endpoint-form-preview-sidebar/views/ResponseView';
import { useEndpointFormPreview } from '@src/react/features/builder/contexts/endpoint-form-preview-sidebar.context';
import classNames from 'classnames';
import { FC, useEffect, useRef, useState } from 'react';
import { FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';
import { PiSpinnerLight } from 'react-icons/pi';

/**
 * Home view component for the preview sidebar
 */
const Processing: FC<{ showBackButton?: boolean; onBackButtonClick?: () => void }> = ({
  showBackButton = true,
  onBackButtonClick,
}) => {
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(true);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');
  const formRef = useRef<HTMLDivElement>(null);
  const { selectedSkill, callSkillMutation, view, setView, abortController } =
    useEndpointFormPreview();

  useEffect(() => {
    if (isFormVisible) {
      setContentHeight('auto');
    } else {
      setContentHeight(0);
    }
  }, [isFormVisible, selectedSkill?.inputsTypes]);

  useEffect(() => {
    // let timeoutId: NodeJS.Timeout;
    if (callSkillMutation.isSuccess || callSkillMutation.isError) {
      // buttonRef?.focus();
      // buttonRef?.click(); // for now we will just click the button to go to the response view
      // timeoutId = setTimeout(() => {
      setView('view_response');
      // }, 100);
    }
    // return () => clearTimeout(timeoutId);
  }, [callSkillMutation.isSuccess, callSkillMutation.isError]);

  return (
    <div className="home-view">
      {showBackButton && (
        <button onClick={onBackButtonClick} className="mb-4 cursor-pointer flex items-center gap-2">
          <ArrowLeftIcon className="w-4 h-4 text-smythos-blue-500" /> Skills List
        </button>
      )}
      <div className={classNames('', view === 'home' && callSkillMutation.isLoading && 'hidden')}>
        <button
          onClick={() => {
            if (view === 'view_response') {
              setIsFormVisible(!isFormVisible);
            }
          }}
          className={classNames(
            'flex items-center justify-between w-full',
            view !== 'view_response' && 'cursor-default pointer-events-none',
          )}
        >
          <h3 className="font-semibold">Inputs and Files</h3>
          {view === 'view_response' && (
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                isFormVisible ? 'rotate-180' : ''
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
        <div
          ref={formRef}
          className="transition-all duration-200 overflow-hidden"
          style={{
            height: typeof contentHeight === 'number' ? `${contentHeight}px` : contentHeight,
          }}
        >
          {selectedSkill?.inputsTypes && <FormFill setIsFormVisible={setIsFormVisible} />}
        </div>
      </div>
      {view === 'home' && (
        <div>
          {/* {requests.map((request) => ( */}
          <button
            ref={setButtonRef}
            key={selectedSkill.skillId}
            className={classNames(
              'bg-slate-100 px-4 py-3 rounded-lg flex items-center justify-between w-full',
              (callSkillMutation.isSuccess || callSkillMutation.isError) && 'cursor-pointer',
            )}
            onClick={() => {
              if (callSkillMutation.isSuccess || callSkillMutation.isError) {
                setView('view_response');
              }
            }}
          >
            <div className="flex items-center">
              <span className="icon svg-icon APIEndpoint w-6 mr-2" />

              <div className="flex flex-col">
                <h4 className="font-bold text-[#3E3E3E] text-sm">{selectedSkill.details.name}</h4>
                <p className="text-gray-500 text-xs">{selectedSkill.details.description}</p>
              </div>
            </div>

            <div className="flex flex-col">
              {callSkillMutation.isLoading && (
                <div className=" p-2 rounded-md flex items-center gap-2">
                  <span>Processing...</span>
                  <PiSpinnerLight className="animate-spin" size={18} />
                </div>
              )}
              {callSkillMutation.isSuccess && (
                <div className="p-2 rounded-md flex items-center gap-2">
                  <FaCircleCheck className="text-green-500" size={20} />
                </div>
              )}
              {callSkillMutation.isError && (
                <div className="p-2 rounded-md flex items-center gap-2">
                  <FaCircleXmark className="text-red-500" size={20} />
                </div>
              )}
            </div>
          </button>
          {/* ))} */}

          {callSkillMutation.isLoading && (
            // option to cancel the request
            <button
              onClick={() => {
                abortController.current?.abort();
                callSkillMutation.reset();
                setView('form');
                setIsFormVisible(true);
              }}
              className="bg-transparent font-bold border border-gray-300 text-gray-500 px-4 py-3 rounded-md w-full mt-8"
            >
              Stop Testing
            </button>
          )}
        </div>
      )}
      {view === 'view_response' && <ResponseView />}
    </div>
  );
};

export default Processing;
