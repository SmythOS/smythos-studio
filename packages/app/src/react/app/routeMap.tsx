import VaultPage from '@react/features/vault/pages/VaultPage';
import AgentsPage from '@src/react/features/agents/pages/AgentsPage';
import { IPageRoute } from '@src/react/shared/types/route';
import AccountDeletedPage from '../features/account/pages/AccountDeletedPage';
import AccountPage from '../features/account/pages/AccountPage';
import AgentSettingsPage from '../features/agent-settings/pages/AgentSettingsPage';
import AIChatPage from '../features/ai-chat/pages/ai-chat';


import TemplatesPage from '../features/templates/pages/TemplatesPage';

export const routeMap: IPageRoute[] = [
 

  { path: '/templates', component: TemplatesPage, title: 'Templates' },

 

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
    title: 'Vault',
    path: 'vault',
    component: VaultPage,
    layoutOptions: { sidebar: true, topMenu: true },
  },
];

export const routeNames = routeMap.map((route) => route.path);
