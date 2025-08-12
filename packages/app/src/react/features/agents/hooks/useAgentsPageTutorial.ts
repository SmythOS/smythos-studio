import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useEffect } from 'react';

type UseAgentsPageTutorialOptions = {
  enabled?: boolean;
  storageKeyPrefix?: string;
  maxAttempts?: number;
  intervalMs?: number;
};

/**
 * Triggers the in-app tutorial on the Agents page for first-time visitors.
 * Uses a per-user localStorage key to ensure it shows only once per user.
 */
export function useAgentsPageTutorial(options: UseAgentsPageTutorialOptions = {}): void {
  const {
    enabled = true,
    storageKeyPrefix = 'agents_page_tutorial_seen',
    maxAttempts = 30, // ~9s total at 300ms
    intervalMs = 300,
  } = options;

  const { userInfo } = useAuthCtx();

  useEffect(() => {
    if (!enabled) return;

    const userId = userInfo?.user?.id || 'anon';
    const storageKey = `${storageKeyPrefix}:${userId}`;

    const hasSeen = typeof window !== 'undefined' && localStorage.getItem(storageKey) === 'true';
    if (hasSeen) return;

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
        const TutorialCtor = (window as any).Tutorial as any;
        if (!TutorialCtor) return;

        const home_page_onboarding = new TutorialCtor({
          onPopoverRender: (popoverElements: any) => {
            setTimeout(() => {
              popoverElements.popoverTitle.innerText = `${popoverElements.popoverTitle.innerText} (${home_page_onboarding.currentStep + 1}/${home_page_onboarding.getSteps().length})`;
            }, 0);
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
        localStorage.setItem(storageKey, 'true');
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
  }, [enabled, storageKeyPrefix, maxAttempts, intervalMs, userInfo?.user?.id]);
}


