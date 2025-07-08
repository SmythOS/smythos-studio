import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import {
  BinaryTreeIcon,
  BookIcon,
  CogIcon,
  DatabaseIcon,
  DiscordIcon,
  GridIcon,
  HomeIcon,
  KeyIcon,
  LineChartIcon,
} from '../components/svgs';

export const PRICING_PLAN_REDIRECT = 'https://smythos.com/pricing/';

export const NEW_ENTERPRISE_PLAN_REDIRECT = 'https://smythos.com/pricing-enquiry/';

export const sidebarMenuItems = [
  { url: '/agents', name: 'Home', icon: HomeIcon },
  { url: '/domains', name: 'Subdomains', icon: BinaryTreeIcon },
  { url: '/data/', name: 'Data Pool', icon: DatabaseIcon },
  { url: '/analytics', name: 'Analytics', icon: LineChartIcon },
  { url: '/vault', name: 'Vault', icon: KeyIcon },
  { url: '/templates', name: 'Templates', icon: GridIcon },
];
export const sidebarMenuItemsWithTeams = [
  { url: '/agents', name: 'Home', icon: HomeIcon },
  { url: '/domains', name: 'Subdomains', icon: BinaryTreeIcon },
  { url: '/data/', name: 'Data Pool', icon: DatabaseIcon },
  { url: '/analytics', name: 'Analytics', icon: LineChartIcon },
  { url: '/vault', name: 'Vault', icon: KeyIcon },
  { url: '/templates', name: 'Templates', icon: GridIcon },
  { url: '/teams/settings', name: 'Space Settings', icon: CogIcon },
];

export const bottomLinks = [
  { title: 'Docs', path: SMYTHOS_DOCS_URL, icon: BookIcon },
  {
    title: 'Discord Support',
    path: 'https://discord.gg/smythos',
    icon: DiscordIcon,
    isExternal: true,
  },
];

export const profileDropdownItems = [
  { url: '/account', name: 'Account' },
  // { url: '/teams', name: 'Spaces' },
  { url: '/teams/members', name: 'User Management' },
  { url: '/teams/settings', name: 'User Management' },
  { url: '/teams/roles', name: 'Manage Roles' },
  { url: '/my-plan', name: 'My Plan' },
];
