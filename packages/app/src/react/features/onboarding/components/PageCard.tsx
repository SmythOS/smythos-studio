import classNames from 'classnames';
import React, { useEffect, useState } from 'react';
import { FaAngleLeft } from 'react-icons/fa6';
// we always use FontAwesome6 icons. https://react-icons.github.io/react-icons/icons/fa6/

import HorizontalProgressBar from '@react/features/onboarding/components/horizontalProgressBar';
import { ArrowRightIcon, TelegramIcon } from '@src/react/shared/components/svgs';
import { Button } from '@src/react/shared/components/ui/newDesign/button';
import { Spinner } from '@src/react/shared/components/ui/spinner';
import { FEATURE_FLAGS } from '@src/shared/constants/featureflags';
import { PostHog } from '@src/shared/posthog';
import { X } from 'lucide-react';

interface PageCardProps<T = any> {
  size?: 'sm' | 'md' | 'lg';
  progress: number;
  hasSkip?: boolean;
  skipText?: string;
  hasClose?: boolean;
  canGoBack?: boolean;
  hideFooter?: boolean;
  isDisabled?: boolean;
  isBuilding?: boolean;
  errorMessage?: string;
  continueText?: string;
  isShareAgent?: boolean;
  hasLogo?: boolean;
  title?: string;
  pageCardClasses?: string;
  pageCardMainBodyClasses?: string;
  BodyComponent: React.ElementType<{
    setData: React.Dispatch<React.SetStateAction<T>>;
    setIsContinueDisabled: React.Dispatch<React.SetStateAction<boolean>>;
    isShareAgent?: boolean;
    handleContinueEvent?: (event?: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
    extraProps?: any;
  }>;
  ErrorCTA?: React.ElementType;
  skipEvent: (event: React.MouseEvent<HTMLButtonElement>) => void;
  backEvent: (event: React.MouseEvent<HTMLButtonElement>) => void;
  closeEvent: (event: React.MouseEvent<HTMLButtonElement>) => void;
  continueEvent: (event: React.MouseEvent<HTMLButtonElement>, data?: T | string) => Promise<void>;
  extraProps?: any;
  actionButtonHalfWidth?: boolean;
}

let startProgress: number | undefined;

export const PageCard: React.FC<PageCardProps> = ({
  progress,
  skipEvent,
  backEvent,
  closeEvent,
  isBuilding,
  isDisabled,
  size = 'md',
  errorMessage,
  BodyComponent,
  continueEvent,
  hasSkip = false,
  canGoBack = true,
  hasClose = false,
  hideFooter = false,
  pageCardClasses = '',
  pageCardMainBodyClasses = '',
  isShareAgent = false,
  extraProps,
  ErrorCTA,
  skipText = 'Skip',
  continueText = 'Continue',
  actionButtonHalfWidth = false,
  hasLogo = true,
  title = '',
}) => {
  const [data, setData] = useState<string>('');
  const [isBusy, setIsBusy] = useState(false);
  const [isContinueDisabled, setIsContinueDisabled] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [showGoToDashboardButton, setShowGoToDashboardButton] = useState<boolean>(false);

  async function handleContinueEvent(event?: React.MouseEvent<HTMLButtonElement>) {
    setIsBusy(true);
    await continueEvent(event, data);
    setIsBusy(false);
  }

  useEffect(() => {
    if (!startProgress || progress > startProgress) {
      startProgress = 0;
      setProgressValue(0);
    }
    setTimeout(() => {
      setProgressValue(progress);
      startProgress = progress;
    }, 500);

    const flagValue = PostHog.getFeatureFlagValue(FEATURE_FLAGS.GO_TO_DASHBOARD_FROM_ONBOARDING);
    setShowGoToDashboardButton(typeof flagValue === 'string' ? flagValue === 'control' : true);
  }, []);

  return (
    <div
      className={classNames(
        pageCardClasses,
        'page-card bg-white shadow-sm border border-solid border-gray-100 p-4 md:p-6 md:w-4/5 rounded-lg text-black',
        {
          'max-w-[562px]': size === 'sm',
          'max-w-[712px]': size === 'md',
          'max-w-[832px]': size === 'lg',
        },
      )}
    >
      {isBusy && (
        <div
          className="bg-white cover absolute top-0 left-0 w-full h-full 
        flex justify-center items-center opacity-80 z-10"
        >
          <Spinner />
        </div>
      )}
      <header
        className={classNames('flex items-center justify-between', {
          ' mb-8 md:mb-[60px]': !isShareAgent,
          'mb-4': isShareAgent,
        })}
      >
        {canGoBack && (
          <button
            onClick={backEvent}
            className="transition duration-300 px-3 py-2 -ml-3 hover:bg-gray-200 hover:text-gray-900
             dark:hover:bg-gray-600 dark:hover:text-white rounded-md flex items-center justify-start"
          >
            <FaAngleLeft />
          </button>
        )}

        {title && (
          <h1 className={`text-xl ${isShareAgent ? 'font-semibold text-[#1E1E1E]' : 'font-bold'}`}>
            {title}
          </h1>
        )}
        {hasLogo && (
          <div className="flex items-center justify-center flex-grow transition duration-300">
            <img src="/img/smythos-logo.png" className="h-12" alt="SmythOS" />
          </div>
        )}
        {hasClose && (
          <button
            onClick={closeEvent}
            className={`absolute right-0 flex items-center justify-end 
              hover:bg-gray-200 p-3 -mr-3 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white
               transition duration-300  rounded-md`}
          >
            <X className="h-5 w-5 font-bold" color="#1E1E1E" strokeWidth={2} />
          </button>
        )}
      </header>
      <main
        className={classNames(
          `page-card-body ${
            pageCardMainBodyClasses ? pageCardMainBodyClasses : 'mb-8 md:mb-[60px]'
          }`,
        )}
      >
        <BodyComponent
          setData={setData}
          setIsContinueDisabled={setIsContinueDisabled}
          isShareAgent={isShareAgent}
          handleContinueEvent={handleContinueEvent}
          extraProps={extraProps}
        />
      </main>
      {errorMessage && (
        <div className="text-center">
          <small className="text-red-500">{errorMessage}</small>
        </div>
      )}

      {ErrorCTA && <ErrorCTA />}

      {!hideFooter && isBuilding ? (
        <footer
          className={classNames('flex w-full place-items-center ', {
            'md:px-[84px] px-0': !showGoToDashboardButton,
            'gap-2.5': showGoToDashboardButton,
          })}
        >
          <Button
            variant="primary"
            disabled={isContinueDisabled || isDisabled}
            handleClick={handleContinueEvent}
            fullWidth={showGoToDashboardButton}
            className={classNames(
              'py-4 text-base h-[59px] rounded-lg bg-[#3C89F9] disabled:bg-[#8AB8FB] disabled:text-white float-right',
              {
                'w-1/2 ml-auto': !showGoToDashboardButton,
              },
            )}
          >
            <TelegramIcon className="mr-2" />
            Build with AI
          </Button>
          {showGoToDashboardButton && (
            <Button
              disabled={isContinueDisabled}
              handleClick={() => (window.location.href = '/agents')}
              fullWidth
              variant="quaternary"
              className="disabled:opacity-80 disabled:cursor-not-allowed float-right"
            >
              <div className="flex w-full flex-col items-start justify-start">
                <span className="text-[15px] font-semibold text-[#3C89F9] group-hover:text-smyth-blue">
                  Go to Dashboard
                </span>
                <span className="leading-relaxed text-xs text-[#6A89B7] group-hover:text-smyth-blue">
                  Explore the workspace first.
                </span>
              </div>
              <ArrowRightIcon className="stroke-[#3C89F9] group-hover:stroke-smyth-blue" />
            </Button>
          )}
        </footer>
      ) : (
        !hideFooter && (
          <footer className="flex w-full mt-4 h-12 text-base">
            <div className="footer-left w-1/2 flex items-center justify-start">
              {/* Content for footer left */}
              {!extraProps?.hideProgress && (
                <div className="progress-placeholder w-[54%] h-2 rounded">
                  <HorizontalProgressBar progress={progressValue} />
                </div>
              )}
            </div>
            <div
              className={classNames('"footer-right flex items-center justify-between gap-x-2', {
                'w-full md:w-1/2': extraProps?.hideProgress,
                'w-1/2': !extraProps?.hideProgress,
              })}
            >
              {/* Adjust the width of Continue and Skip buttons along with their specific styles */}
              {hasSkip && (
                <div className={`${actionButtonHalfWidth ? 'w-1/2' : 'w-3/12'}`}>
                  <Button handleClick={skipEvent} variant="secondary" fullWidth>
                    {skipText || 'Skip'}
                  </Button>
                </div>
              )}
              <div className={`${actionButtonHalfWidth ? 'w-1/2' : 'w-60'}`}>
                <Button
                  disabled={isContinueDisabled || isDisabled}
                  handleClick={handleContinueEvent}
                  fullWidth
                >
                  {continueText || 'Continue....'}
                </Button>
              </div>
            </div>
          </footer>
        )
      )}
    </div>
  );
};
