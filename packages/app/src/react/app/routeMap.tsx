import VaultPage from '@react/features/vault/pages/VaultPage';
import AgentsPage from '@src/react/features/agents/pages/AgentsPage';
import DataPoolPage from '@src/react/features/data-pool/pages/DataPoolPage';
import DatasourcesPage from '@src/react/features/data-pool/pages/DatasourcesPage';
import { IPageRoute } from '@src/react/shared/types/route';
import AccountDeletedPage from '../features/account/pages/AccountDeletedPage';
import AgentSettingsPage from '../features/agent-settings/pages/AgentSettingsPage';
import AgentChatPage from '../features/ai-chat/pages/ai-chat';

export const routeMap: IPageRoute[] = [
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
    component: AgentChatPage,
    layoutOptions: {
      sidebar: false,
      topMenu: false,
      useFullWidthLayout: true,
    },
  },
  {
    path: '/chat/:agentId/chat?/:chatId?',
    component: AgentChatPage,
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
    layoutOptions: { background: 'white' },
  },
  {
    path: '/agents',
    component: AgentsPage,
    title: 'Agents',
    layoutOptions: { background: 'white' },
  },

  {
    title: 'Vault',
    path: 'vault',
    component: VaultPage,
    layoutOptions: { sidebar: true, topMenu: true },
  },
  {
    title: 'Data Pool',
    path: 'data-pool',
    component: DataPoolPage,
    layoutOptions: { sidebar: true, topMenu: true, background: 'white' },
  },
  {
    title: 'Datasources',
    path: 'data-pool/:namespaceLabel/datasources',
    component: DatasourcesPage,
    layoutOptions: { sidebar: true, topMenu: true, background: 'white' },
  },
];

export const routeNames = routeMap.map((route) => route.path);
