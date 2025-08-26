import { useGetUserSettings, useStoreUserSettings } from '@react/shared/hooks/useUserSettings';
import { Analytics } from '@src/shared/posthog/services/analytics';
import { userSettingKeys } from '@src/shared/userSettingKeys';
import { useEffect, useRef } from 'react';

type UseAgentsPageTutorialOptions = {
  enabled?: boolean;
  maxAttempts?: number;
  intervalMs?: number;
};

/**
 * Triggers the in-app tutorial on the Agents page for first-time visitors.
 * Uses user settings to ensure it shows only once per user.
 */
export function useAgentsPageTutorial(options: UseAgentsPageTutorialOptions = {}): void {
  const {
    enabled = true,
    maxAttempts = 30, // ~9s total at 300ms
    intervalMs = 300,
  } = options;

  const { data: tutorialSeen } = useGetUserSettings(userSettingKeys.SEEN_AGENTS_PAGE_TUTORIAL);
  const storeUserSettings = useStoreUserSettings(userSettingKeys.SEEN_AGENTS_PAGE_TUTORIAL);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // Check if user has already seen the tutorial or if tutorial has already been started
    if (tutorialSeen === 'true' || hasStartedRef.current) return;

    let attempts = 0;

    const isReady = () => {
      const TutorialCtor = (window as any)?.Tutorial;
      if (!TutorialCtor) return false;
      const main = document.querySelector('main');
      const sidebar = document.querySelector('div[data-qa="navigation-sidebar"]');
      const createBtn = document.querySelector('button[data-qa="create-agent-button"]');
      return Boolean(main && sidebar && createBtn);
    };

    const startTutorial = () => {
      try {
        // Mark as started to prevent multiple triggers
        hasStartedRef.current = true;

        const TutorialCtor = (window as any).Tutorial as any;
        if (!TutorialCtor) return;

        const home_page_onboarding = new TutorialCtor({
          onPopoverRender: (popoverElements: any) => {
            setTimeout(() => {
              popoverElements.popoverTitle.innerText = `${popoverElements.popoverTitle.innerText} (${home_page_onboarding.currentStep + 1}/${home_page_onboarding.getSteps().length})`;
            }, 0);
          },
          onReset: () => {
            // Called when overlay is about to be cleared
            Analytics.track('home_page_tutorial_completed', {
              page_url: '/agents',
              source: 'Tutorial completed on home page onboarding',
            });

            // Mark tutorial as completed in user settings
            storeUserSettings.mutate('true');
          },
          animate: true,
          showButtons: true,
          nextBtnText: 'Next',
          prevBtnText: 'Previous',
          closeBtnText: 'Close',
          padding: 10,
          overlayOpacity: 0.7,
        });

        home_page_onboarding.defineSteps([
          {
            element: 'main',
            popover: {
              title: '<strong>Welcome to SmythOS</strong>',
              description:
                'This is your team dashboard where you can manage AI agents, access templates, and organize your work.',
              position: 'center',
              align: 'center',
              highlight: true,
            },
          },
          {
            element: 'div[data-qa="navigation-sidebar"]',
            popover: {
              title: '<strong>Main Navigation</strong>',
              description:
                'Use this sidebar to navigate between different sections of SmythOS including Home, Templates, Data Pool, Analytics, Vault, and more.',
              position: 'right',
              align: 'start',
              highlight: true,
            },
          },
          {
            element: 'button[data-qa="create-agent-button"]',
            popover: {
              title: '<strong>Create New Agent</strong>',
              description:
                'Click here to start building a new AI agent from scratch using our visual workflow builder.',
              position: 'bottom',
              align: 'center',
              highlight: true,
            },
          },
        ]);

        home_page_onboarding.start();
      } catch {
        // swallow errors to avoid blocking the page
      }
    };

    const interval = window.setInterval(() => {
      attempts += 1;
      if (isReady()) {
        window.clearInterval(interval);
        startTutorial();
      } else if (attempts >= maxAttempts) {
        window.clearInterval(interval);
      }
    }, intervalMs);

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [enabled, maxAttempts, intervalMs, tutorialSeen, storeUserSettings]);
}
