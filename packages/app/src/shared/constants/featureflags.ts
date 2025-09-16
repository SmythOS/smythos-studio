export enum FEATURE_FLAGS {
  AGENT_KEY_DROPDOWN = 'agent-card-dropdown',
  DONT_DELETE_IMPORTANT_SMYTH_STAFF_DOMAINS = 'DONT-DELETE-IMPORTANT_SMYTH-STAFF-DOMAINS', // payload will be an array of domains
  TEAMS_UI = 'teams-ui',
  NEW_PRICING_COLUMNS = 'new-pricing-columns',
  DASHBOARD_CHECKLIST = 'dashboard-checklist',
  INITIATE_WEAVER_MESSAGE = 'initiate_weaver_message',
  INCREASE_UPGRADE = 'increase-upgrade',
  EXPERIMENT_2 = 'experiment-2',
  DEPLOY_MODAL = 'deploy-modal',
  DEBUG_TOGGLE_UI_REFRESH = 'debug-toggle-ui-refresh',
  DEBUG_INJECT_TEXT_EXPERIMENT = 'debug-inject-text-experiment',
  DEBUG_INJECT_BUTTON_EXPERIMENT = 'debug-inject-button-experiment',
  POSTHOG_EXPERIMENT_FIX_WITH_AI = 'posthog-experiment-fix-with-ai',
  ONBOARDING_CALLS_FOR_BUILDER_PLAN = 'onboarding-calls-for-builder-plan',
  GO_TO_DASHBOARD_FROM_ONBOARDING = 'go-to-dashboard-from-onboarding',
  TEST_FORM_TRY_DEBUG_BUTTON_EXPERIMENT = 'test-form-try-debug-button-experiment',
  WEAVER_NEXT_STEPS_WITH_DEBUG_DEPLOY = 'weaver-next-steps-with-debug-deploy',
  EXPERIMENT_MOBILE_NUMBER_IN_ONBOARDING = 'experiment-mobile-number-in-onboarding',
}

export const FEATURE_FLAG_PAYLOAD_RELEASE_TYPE = {
  GA: 'ga',
  BETA: 'beta',
  ALPHA: 'alpha',
  PUBLIC: 'public',
  ALPHA_STAGING: 'alpha-staging',
};
