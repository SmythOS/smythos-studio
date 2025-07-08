import AnalyticsPage from '@react/features/analytics/pages/AnalyticsPage';
import MyPlanPage from '@react/features/subscriptions/pages/MyPlanPage';
import VaultPage from '@react/features/vault/pages/VaultPage';
import AgentsPage from '@src/react/features/agents/pages/AgentsPage';
import { IPageRoute } from '@src/react/shared/types/route';
import AccountDeletedPage from '../features/account/pages/AccountDeletedPage';
import AccountPage from '../features/account/pages/AccountPage';
import AgentSettingsBulkCallPage from '../features/agent-settings/pages/AgentSettingsBulkCallPage';
import AgentSettingsPage from '../features/agent-settings/pages/AgentSettingsPage';
import AIChatPage from '../features/ai-chat/pages/ai-chat';
import DataPage from '../features/data-space/pages/DataPage';
import DatasourceLibrary from '../features/data-space/pages/DatasourceLibrary';
import DomainsPage from '../features/domains-space/pages/DomainsPage';
import { BookAnIntroCallPage } from '../features/onboarding/pages/BookAnIntroCallPage';
import { OnboardPage } from '../features/onboarding/pages/OnboardPage';
import { WelcomeInvitePage } from '../features/onboarding/pages/WelcomeInvitePage';
import { WelcomePage } from '../features/onboarding/pages/WelcomePage';
import { WelcomePayment } from '../features/onboarding/pages/WelcomePayment';
import { WelcomeTeamPage } from '../features/onboarding/pages/WelcomeTeamPage';
import { WelcomeWorkPage } from '../features/onboarding/pages/WelcomeWorkPage';
import PartnersPage from '../features/partners/pages/PartnersPage';
import FeaturePageUpsell from '../features/subscriptions/components/paywalls/feature-page-upsell';
import {
  EnterpriseT1PageV4,
  EnterpriseT2PageV4,
  EnterpriseT3PageV4,
  EnterpriseT4PageV4,
  PartnerPageV4,
} from '../features/subscriptions/pages/EnterpriseTierPagesV4';
import MultiComponentSubscriptionPage from '../features/subscriptions/pages/MultiComponentSubscriptionPage';
import { PlansPricingPage } from '../features/subscriptions/pages/PlansPricingPage';
import SinglePriceSubscriptionPage from '../features/subscriptions/pages/SinglePriceSubscriptionPage';
import AcceptInvitationPage from '../features/teams/pages/accept-invitation-page';
import { SpaceSettings } from '../features/teams/pages/space-settings';
import TeamMembersPage from '../features/teams/pages/team-members';
import { TeamsPage } from '../features/teams/pages/teams';
import RolesPage from '../features/teams/pages/teams-roles';
import TemplatesPage from '../features/templates/pages/TemplatesPage';

export const routeMap: IPageRoute[] = [
  { path: '/data', component: DataPage, title: 'Data Pool' },
  { path: '/data/:dataspace', component: DatasourceLibrary, title: 'Datasources' },
  {
    path: '/domains',
    component: DomainsPage,
    access: {
      subscriptionBased: true,
      checkAccess: (subs) => subs.plan.properties?.flags?.domainRegistrationEnabled,
      UpsellContent: <FeaturePageUpsell.Subdomains />,
    },
    title: 'Domains',
  },

  { path: '/templates', component: TemplatesPage, title: 'Templates' },
  {
    path: '/teams',
    component: TeamsPage,
    title: 'Teams',
  },
  {
    path: '/teams/settings',
    component: SpaceSettings,
    title: 'Space Settings',
  },
  {
    path: '/teams/roles',
    component: RolesPage,
    access: {
      subscriptionBased: true,
      checkAccess: (subs) => subs.plan.paid && subs.plan.properties?.limits?.teamMembers > 1,
      UpsellContent: <FeaturePageUpsell.Roles />,
    },
    title: 'Roles',
  },
  {
    path: '/teams/members',
    component: TeamMembersPage,
    access: {
      subscriptionBased: true,
      checkAccess: (subs) => subs.plan.paid && subs.plan.properties?.limits?.teamMembers > 1,
      UpsellContent: <FeaturePageUpsell.Teams />,
    },
    title: 'User Management',
  },
  {
    path: '/teams/accept-invitation/:invitationId',
    component: AcceptInvitationPage,
    title: 'Accept Invitation',
    layoutOptions: {
      sidebar: false,
      topMenu: false,
      container: false,
    },
  },

  {
    path: '/plans',
    component: PlansPricingPage,
    title: 'Plans',
  },
  { path: '/partners', component: PartnersPage, title: 'Partners' },
  { path: '/subscriptions/:priceId', component: SinglePriceSubscriptionPage, title: 'Subscription' },
  { path: '/subscriptions', component: MultiComponentSubscriptionPage, title: 'Subscription' },
  { path: '/account', component: AccountPage, title: 'Account' },
  {
    path: '/account-deleted',
    component: AccountDeletedPage,
    skipAuth: true,
    title: 'Account Deleted',
    layoutOptions: {
      sidebar: false,
      topMenu: false,
    },
  },
  {
    path: '/agent-settings/:agentId',
    component: AgentSettingsPage,
    title: 'Agent Settings',
    layoutOptions: {},
  },
  {
    path: '/chat',
    component: AIChatPage,
    layoutOptions: {
      sidebar: false,
      topMenu: false,
      useFullWidthLayout: true,
    },
  },
  {
    path: '/chat/:agentId/chat?/:chatId?',
    component: AIChatPage,
    layoutOptions: {
      sidebar: false,
      topMenu: false,
      useFullWidthLayout: true,
    },
  },
  {
    path: '/agent-settings/:agentId/bulk/:componentId',
    component: AgentSettingsBulkCallPage,
    title: 'Bulk Call',
    access: {
      subscriptionBased: true,
      checkAccess: (subs) => subs.plan.paid,
      UpsellContent: <FeaturePageUpsell.BulkCalls />,
    },
  },
  {
    path: '/onboard',
    title: 'Almost there ...',
    component: OnboardPage,
    layoutOptions: {
      sidebar: false,
      topMenu: false,
    },
  },
  {
    path: '/welcome',
    title: 'Almost there ...',
    component: WelcomePage,
    layoutOptions: {
      sidebar: false,
      topMenu: false,
      container: false,
    },
  },
  {
    path: '/welcome/jobtype',
    title: 'What do you do?',
    component: WelcomeTeamPage,
    layoutOptions: {
      sidebar: false,
      topMenu: false,
      container: false,
    },
  },
  {
    path: '/welcome/work',
    title: 'What do you want to build?',
    component: WelcomeWorkPage,
    layoutOptions: {
      sidebar: false,
      topMenu: false,
      container: false,
    },
  },
  {
    path: '/welcome/book-intro-call',
    title: 'Schedule Your Onboarding Call',
    component: BookAnIntroCallPage,
    layoutOptions: {
      sidebar: false,
      topMenu: false,
      container: false,
    },
  },
  {
    path: '/welcome/invite',
    title: 'Invite team mates',
    component: WelcomeInvitePage,
    layoutOptions: {
      sidebar: false,
      topMenu: false,
      container: false,
    },
  },
  {
    path: '/welcome/payment',
    title: 'Welcome to SmythOS!',
    component: WelcomePayment,
    layoutOptions: {
      sidebar: false,
      topMenu: false,
      container: false,
    },
  },

  {
    path: '/enterprise-t1',
    component: EnterpriseT1PageV4,
    title: 'Enterprise T1',
    skipAuth: true,
    layoutOptions: {
      sidebar: true,
      topMenu: true,
    },
  },
  {
    path: '/enterprise-t2',
    component: EnterpriseT2PageV4,
    title: 'Enterprise T2',
    skipAuth: true,
    layoutOptions: {
      sidebar: true,
      topMenu: true,
    },
  },
  {
    path: '/enterprise-t3',
    component: EnterpriseT3PageV4,
    title: 'Enterprise T3',
    skipAuth: true,
    layoutOptions: {
      sidebar: true,
      topMenu: true,
    },
  },
  {
    path: '/enterprise-t4',
    component: EnterpriseT4PageV4,
    title: 'Enterprise T4',
    skipAuth: true,
    layoutOptions: {
      sidebar: true,
      topMenu: true,
    },
  },
  {
    path: '/partner',
    component: PartnerPageV4,
    title: 'Partner',
    skipAuth: true,
    layoutOptions: {
      sidebar: true,
      topMenu: true,
    },
  },

  { path: '/', component: AgentsPage, title: 'Agents' },
  { path: '/agents', component: AgentsPage, title: 'Agents' },

  {
    title: 'My Plan',
    path: 'my-plan',
    component: MyPlanPage,
    layoutOptions: { sidebar: true, topMenu: true },
  },
  {
    title: 'Analytics',
    path: 'analytics',
    component: AnalyticsPage,
    layoutOptions: { sidebar: true, topMenu: true },
  },
  {
    title: 'Vault',
    path: 'vault',
    component: VaultPage,
    layoutOptions: { sidebar: true, topMenu: true },
  },
];

export const routeNames = routeMap.map((route) => route.path);
