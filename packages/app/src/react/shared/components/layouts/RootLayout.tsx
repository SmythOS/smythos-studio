import { SidebarWithErrorBoundary } from '@react/shared/components/sidebar/Sidebar';
import { Spinner } from '@react/shared/components/ui/spinner';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useOnboarding } from '@src/react/features/agents/contexts/OnboardingContext';
import OnboardingCompletedModal from '@src/react/features/onboarding/modals/OnboardingCompleted';
import classNames from 'classnames';
import React, { Suspense, useEffect, useState } from 'react';
import { TopbarPrimary } from './topbarPrimary/TopbarPrimary';

interface IRootLayoutProps {
  layoutOptions?: {
    sidebar?: boolean;
    topMenu?: boolean;
    container?: boolean;
    noScroll?: boolean;
    useFullWidthLayout?: boolean;
  };
  isWelcomePage?: boolean;
  isAcceptInvitationPage?: boolean;
}

export const RootLayout = ({
  children,
  layoutOptions = {},
  isWelcomePage,
  isAcceptInvitationPage,
}: React.PropsWithChildren & IRootLayoutProps) => {
  const { isOnboardingCompleted, toggleOnboardingCompleted } = useOnboarding();
  const {
    sidebar = true,
    topMenu = true,
    container = true,
    noScroll = false,
    useFullWidthLayout = false,
  } = layoutOptions;
  const { loading } = useAuthCtx();
  const [hasScrollbar, setHasScrollbar] = useState<boolean>(false);

  /**
   * Checks if the main content has a scrollbar and adjusts the topbar width accordingly
   * with a debounce mechanism to prevent frequent calls
   */
  const checkForScrollbar = (() => {
    let timeoutId: NodeJS.Timeout | null = null;

    return () => {
      // Clear any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Set a new timeout with 500ms buffer
      timeoutId = setTimeout(() => {
        const mainContent = document.getElementById('main-content');
        const topbar = document.getElementById('primary-topbar');

        if (mainContent && topbar && topMenu) {
          // Check if scrollbar is present by comparing scroll height to client height
          const hasVerticalScrollbar = mainContent.scrollHeight > mainContent.clientHeight;
          setHasScrollbar(hasVerticalScrollbar);

          // Adjust topbar width based on scrollbar presence
          topbar.style.width = hasVerticalScrollbar ? 'calc(100% - 8px)' : '100%';

          // Check width of topbar and add margin-left 0 if its width is more than 1600px
          if (topbar.offsetWidth > 1600) {
            topbar.style.marginLeft = '0 !important';
          } else {
            topbar.style.marginLeft = 'auto !important';
          }
        }
      }, 500);
    };
  })();

  useEffect(() => {
    // Run on initial load
    Array.from({ length: 10 }).forEach((_, index) => {
      setTimeout(() => {
        checkForScrollbar();
      }, index * 2000);
    });

    // Add resize event listener
    window.addEventListener('resize', checkForScrollbar);

    // Set up mutation observer to detect DOM changes in main-content
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      const observer = new MutationObserver(() => {
        checkForScrollbar();
      });

      // Observe changes to child elements and their attributes
      observer.observe(mainContent, {
        childList: true, // Watch for changes to child elements
        subtree: true, // Watch the entire subtree
        attributes: true, // Watch for attribute changes
        characterData: true, // Watch for text content changes
      });

      // Cleanup
      return () => {
        window.removeEventListener('resize', checkForScrollbar);
        observer.disconnect();
      };
    }

    // Fallback cleanup if mainContent isn't available
    return () => {
      window.removeEventListener('resize', checkForScrollbar);
    };
  }, []);

  return (
    <div className={classNames('flex flex-col h-screen overflow-hidden')}>
      <div className="flex flex-1 min-h-0 bg-[#F5F5F5]">
        {sidebar && <SidebarWithErrorBoundary />}
        <main
          className={classNames(
            'relative flex flex-1 flex-col min-w-0 transition-all duration-300 mt-2.5 ml-0 mb-0',
          )}
        >
          {useFullWidthLayout ? (
            <div
              className={classNames(
                'absolute top-[-12px] left-0 h-[calc(100%+3rem)] w-[100%] rounded-none bg-[#FFF]',
              )}
            ></div>
          ) : (
            <div
              className={classNames(
                'absolute top-1 h-full ml-16 md:ml-auto w-[calc(100%-4.5rem)] md:w-[calc(100%-0.75rem)] rounded-t-lg border border-solid border-[#D1D1D1] bg-[#FFF]',
              )}
            ></div>
          )}
          <Suspense
            fallback={
              <div className="w-full h-screen flex items-center justify-center">
                <Spinner />
              </div>
            }
          >
            {topMenu && <TopbarPrimary />}
            <div
              id="main-content"
              className={classNames('flex-1 overflow-x-hidden', {
                'overflow-y-auto': !noScroll,
                'px-8 py-4 md:px-4': sidebar && !loading,
                'w-full': container,
                'bg-with-lines': isWelcomePage || isAcceptInvitationPage,
                'overflow-y-hidden': false,
              })}
              style={{
                scrollbarGutter: 'stable',
              }}
            >
              <div className="max-w-[1224px] mx-auto h-full">{children}</div>
            </div>
          </Suspense>

          <OnboardingCompletedModal
            isOpen={isOnboardingCompleted}
            onClose={() => toggleOnboardingCompleted()}
          />
          {/* <ToastContainer /> */}
        </main>
      </div>
    </div>
  );
};
