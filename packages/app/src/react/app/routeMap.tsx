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

import TemplatesPage from '../features/templates/pages/TemplatesPage';

export const routeMap: IPageRoute[] = [
 

  { path: '/templates', component: TemplatesPage, title: 'Templates' },

  {
    path: '/plans',
    component: PlansPricingPage,
    title: 'Plans',
  },
  { path: '/partners', component: PartnersPage, title: 'Partners' },
  {
    path: '/subscriptions/:priceId',
    component: SinglePriceSubscriptionPage,
    title: 'Subscription',
  },
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

  {
    path: '/',
    component: AgentsPage,
    title: 'Agents',
    layoutOptions: { background: 'agentsGradient' },
  },
  {
    path: '/agents',
    component: AgentsPage,
    title: 'Agents',
    layoutOptions: { background: 'agentsGradient' },
  },

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
