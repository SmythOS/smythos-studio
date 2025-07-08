import { SMYTHOS_DOCS_URL } from '../../../shared/constants/general';
import config from '../../config';

export const navPages = [
  { url: '/agents', name: 'Agent Dashboard' },
  { url: '/templates', name: 'Templates' },
  { url: '/domains', name: 'Subdomains' },
  { url: '/data', name: 'Data Pool' },
  { url: '/analytics', name: 'Analytics' },
  { url: '/vault', name: 'Vault' },
  { url: SMYTHOS_DOCS_URL, name: 'Documentation', isExternal: true },
];
export const profilePages = [
  { url: '/account', name: 'Account' },
  { url: '/teams/members', name: 'User Management' },
  { url: '/teams/roles', name: 'Manage Roles' },
  { url: '/my-plan', name: 'My Plan', reload: true },
  // { url: '/partners', name: 'Partners' },
];

export const getNavPages = (getPageAccess, pageAcl, apiAcl) => {
  return navPages.filter((p) => getPageAccess(pageAcl, apiAcl, p.url)?.read);
};

if (config.env.NODE_ENV === 'PROD') {
  //remove /templates from navPages (search by name)
  // const templatesIndex = navPages.findIndex((p) => p.url === '/templates');
  // if (templatesIndex > -1) {
  //     navPages.splice(templatesIndex, 1);
  // }
  //remove /my-plan from profilePages (search by name)
  /* const myPlanIndex = profilePages.findIndex((p) => p.url === '/my-plan');
    if (myPlanIndex > -1) {
        profilePages.splice(myPlanIndex, 1);
    } */
}
