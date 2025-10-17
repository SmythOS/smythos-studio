import { authStore } from '@shared/state_stores/auth';
import { userSettingKeys } from '@shared/userSettingKeys';
import { getUserSettings, saveUserSettings } from '@src/react/shared/hooks/useUserSettings';
import { TUTORIAL_CUTOFF_DATE } from '@src/shared/constants/tutorial';
import { Observability } from '@src/shared/observability';

export const builderPageTutorialWorkflow = async () => {
  const userInfo = authStore.getState().userInfo;
  const isNewUser = userInfo?.user?.createdAt
    ? new Date(userInfo.user.createdAt) > TUTORIAL_CUTOFF_DATE
    : false;

  // Only show tutorial to new users
  if (!isNewUser) return null;

  const tutorialSeen = await getUserSettings(userSettingKeys.SEEN_BUILDER_PAGE_TUTORIAL);

  // Check if user has already seen the tutorial
  if (tutorialSeen === 'true') return null;

  const Tutorial = (window as any)?.Tutorial;
  if (!Tutorial) return null;

  const tutorialWorkflow = new Tutorial({
    onPopoverRender: (popoverElements) => {
      // Update the popover title with step count immediately after internal boarding logic
      setTimeout(() => {
        popoverElements.popoverTitle.innerText = `${
          popoverElements.popoverTitle.innerText
        } (${tutorialWorkflow.currentStep + 1}/${tutorialWorkflow.getSteps().length})`;
      }, 0);
    },
    onReset: () => {
      // Called when overlay is about to be cleared
      Observability.observeInteraction('builder_page_tutorial_completed', {
        page_url: '/builder',
        source: 'Tutorial completed on builder page onboarding',
      });

      saveUserSettings(userSettingKeys.SEEN_BUILDER_PAGE_TUTORIAL, 'true');
    },
    animate: true,
    showButtons: true,
    nextBtnText: 'Next',
    prevBtnText: 'Previous',
    closeBtnText: 'Close',
    padding: 10,
    opacity: 0.7,
  });

  tutorialWorkflow.defineSteps([
    {
      element: '#workspace-container',
      popover: {
        title: '<strong>Welcome to SmythOS Builder</strong>',
        description:
          "Welcome to the <strong>SmythOS Builder</strong>! This is your visual canvas where you'll create powerful AI agents by connecting components. Drag, drop, and connect elements to build sophisticated workflows.",
        preferredPosition: 'center',
        alignment: 'center',
        className: 'welcome-builder',
      },
    },
    {
      element: '#agentBuilder-sidebar',
      popover: {
        title: '<strong>Agent Weaver</strong>',
        description:
          'Use <strong>Agent Weaver</strong> to describe your agent in natural language. This AI assistant converts your requirements into functional workflows.',
        preferredPosition: 'right',
        alignment: 'start',
        className: 'weaver-intro',
      },
    },
    {
      element: '[data-qa="sidebar-components-integrations-panel"]',
      popover: {
        title: '<strong>Components & Integrations</strong>',
        description:
          'Access <strong>Components & Integrations</strong> to build your agent. Components provide building blocks with inputs, outputs, and settings, while integrations connect you to external services, APIs, databases, and third-party tools.',
        preferredPosition: 'right',
        alignment: 'center',
        className: 'components-integrations-highlight',
      },
    },
    {
      element: '[data-qa="builder-toolbar-actions"]',
      popover: {
        title: '<strong>Debug, Test & Deploy</strong>',
        description:
          'Use the toolbar to manage your agent lifecycle: <strong>Debug</strong> for component-level inspection and testing, <strong>Test</strong> for Form Preview and API testing, and <strong>Deploy</strong> to make your agent live with SSL/TLS certification and version control.',
        preferredPosition: 'bottom',
        alignment: 'center',
        className: 'toolbar-actions-highlight',
      },
    },
  ]);

  return tutorialWorkflow;
};
