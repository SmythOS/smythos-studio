export enum OnboardingTaskType {
  ONBOARDING_LIST_DISMISSED = 'ONBOARDING_LIST_DISMISSED',
  UNLOCK_AI_MODELS = 'UNLOCK_AI_MODELS',
  QUICK_GUIDED_EXAMPLE = 'QUICK_GUIDED_EXAMPLE',
  INVITE_TEAM_MEMBERS = 'INVITE_TEAM_MEMBERS',
  SETUP_TEAM_ROLES = 'SETUP_TEAM_ROLES',
  TRY_AGENT_TEMPLATE = 'TRY_AGENT_TEMPLATE',
  CREATE_FIRST_AGENT = 'CREATE_FIRST_AGENT',
  DEPLOY_FIRST_AGENT = 'DEPLOY_FIRST_AGENT',
  DEPLOY__AGENT = 'DEPLOY__AGENT',
  JOIN_COMMUNITY = 'JOIN_COMMUNITY',
  COMPLETED_TASK = 'COMPLETED_TASK',
  TEAM_MEMBERS_TEAM_ROLES = 'TEAM_MEMBERS_TEAM_ROLES',
}

export interface OnboardingTaskProps {
  type: OnboardingTaskType;
  title: string;
  description: string;
  completed: boolean;
  icon: string;
  buttons: {
    label: string;
    type?: OnboardingTaskType;
    link: string;
    reload?: boolean;
    external?: boolean;
    completeOnClick?: boolean;
    enableAfterComplete?: boolean;
  }[];
  completeDescription: string;
}

export interface LearnCardProps {
  image: string;
  title: string;
  description: string;
  link: string;
}
