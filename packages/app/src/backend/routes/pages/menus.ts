import { SMYTHOS_DOCS_URL } from '../../../shared/constants/general';

export const navPages = [
  { url: '/agents', name: 'Agent Dashboard' },
  { url: '/domains', name: 'Subdomains' },
  { url: '/data', name: 'Data Pool' },
  { url: '/analytics', name: 'Analytics' },
  { url: '/templates', name: 'Templates' },
  { url: '/vault', name: 'Vault' },
  { url: SMYTHOS_DOCS_URL, name: 'Documentation', isExternal: true },
];
export const profilePages = [
  { url: '/account', name: 'Account' },
  { url: '/teams/members', name: 'User Management' },
  { url: '/teams/roles', name: 'Manage Roles' },
  { url: '/my-plan', name: 'My Plan', reload: true },
];

export const getNavPages = (getPageAccess, pageAcl, apiAcl) => {
  return navPages.filter((p) => getPageAccess(pageAcl, apiAcl, p.url)?.read);
};
