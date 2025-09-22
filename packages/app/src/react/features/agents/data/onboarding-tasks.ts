import { OnboardingTaskProps, OnboardingTaskType } from '@src/react/shared/types/onboard.types';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';

export const onboardingTasks: OnboardingTaskProps[] = [
  {
    type: OnboardingTaskType.QUICK_GUIDED_EXAMPLE,
    title: 'Quickstart with Example',
    icon: '/img/onboard/flag.svg',
    description: 'Learn basics with a hands-on example.',
    completed: false,
    buttons: [
      {
        label: 'Read',
        link: `${SMYTHOS_DOCS_URL}/agent-studio/quickstart/`,
        external: true,
        completeOnClick: true,
      },
    ],
    completeDescription: 'You\'ve successfully completed the interactive quickstart guide',
  },
  {
    type: OnboardingTaskType.INVITE_TEAM_MEMBERS,
    title: 'Invite Team Members',
    icon: '/img/onboard/invite.svg',
    description: 'Collaborate seamlessly to build and chat with agents.',
    completed: false,
    buttons: [
      {
        label: 'Invite Team Members',
        link: '/teams/members',
        type: OnboardingTaskType.INVITE_TEAM_MEMBERS,
      },
    ],
    completeDescription: 'You\'ve successfully invited your team members to the platform',
  },
  {
    type: OnboardingTaskType.TRY_AGENT_TEMPLATE,
    title: 'Start with Template',
    icon: '/img/onboard/category.svg',
    description: 'Try one of our pre-built templates.',
    completed: false,
    buttons: [
      {
        label: 'Go to Templates',
        link: '/templates',
        completeOnClick: true,
      },
    ],
    completeDescription: 'You\'ve successfully created an agent using our template',
  },
  {
    type: OnboardingTaskType.JOIN_COMMUNITY,
    title: 'Join Community',
    icon: '/img/onboard/community.svg',
    description: 'Get live support in our vibrant community.',
    completed: false,
    buttons: [
      {
        label: 'Join our Discord',
        link: 'https://discord.gg/smythos',
        external: true,
        completeOnClick: true,
      },
    ],
    completeDescription: 'You\'ve successfully joined our community',
  },
  {
    type: OnboardingTaskType.CREATE_FIRST_AGENT,
    title: 'Build Agent from Scratch',
    description: 'Build your first agent from scratch.',
    icon: '/img/onboard/build.svg',
    completed: false,
    buttons: [
      {
        label: 'Build',
        link: '/builder',
        reload: true,
        external: true,
      },
    ],
    completeDescription: 'You\'ve successfully created an agent using our step-by-step guide',
  },
];
