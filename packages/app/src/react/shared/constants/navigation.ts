import { plugins, PluginTarget, PluginType } from '@src/react/shared/plugins/Plugins';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { BookIcon, DiscordIcon, GridIcon, HomeIcon, KeyIcon } from '../components/svgs';

export const PRICING_PLAN_REDIRECT = 'https://smythos.com/pricing/';

export const NEW_ENTERPRISE_PLAN_REDIRECT = 'https://smythos.com/pricing-enquiry/';

export type SidebarMenuItem = {
  url: string;
  name: string;
  icon: React.FC;
  visible: boolean | ((ctx: any) => boolean);
  order?: number;
};

export const getSidebarMenuItems = (): SidebarMenuItem[] => {
  let pluginItems = (
    plugins.getPluginsByTarget(PluginTarget.SidebarMenuItems, PluginType.Config) as {
      config: SidebarMenuItem;
    }[]
  ).flatMap((item) => item.config);

  return [
    { url: '/agents', name: 'Home', icon: HomeIcon, visible: true, order: 1 },
    { url: '/vault', name: 'Vault', icon: KeyIcon, visible: true, order: 5 },
    { url: '/templates', name: 'Templates', icon: GridIcon, visible: true, order: 6 },
    ...pluginItems,
  ].sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const bottomLinks = [
  { title: 'Docs', path: SMYTHOS_DOCS_URL, icon: BookIcon, isExternal: true },
  {
    title: 'Discord Support',
    path: 'https://discord.gg/smythos',
    icon: DiscordIcon,
    isExternal: true,
  },
];

export const profileDropdownItems = () => {
  const pluginItems = (
    plugins.getPluginsByTarget(PluginTarget.TopMenuProfileDropdownItems, PluginType.Config) as {
      config: any;
    }[]
  ).flatMap((item) => item.config);

  return [
    { url: '/account', name: 'Account' },
    // { url: '/teams/members', name: 'User Management' },
    ...pluginItems,
    { url: '/teams/settings', name: 'User Management' },
  ];
};
