import config from './config';
import * as aclsUtils from './utils/acls.utils';

const ejsHelper = {
  isCurrentPage: (currentUrl, path) => currentUrl === path || currentUrl.startsWith(`${path}/`),
  setMenuActiveStatus: (currentUrl, path) =>
    ejsHelper.isCurrentPage(currentUrl, path) ? 'active' : '',
  hasAccess: (user, path) => {
    const userAcls = user.acls;
    let rule = aclsUtils.getRule(userAcls.page, path);

    return rule?.access === 'rw' || rule?.access === 'r';
  },
  isSmythStaff: (user) => {
    //FIXME : needs a better way to check if user is smyth staff
    const allowedEmails = config.env.SMYTH_STAFF_EMAILS;
    const staffEmails = allowedEmails
      .split(',')
      .map((email) => email.trim())
      // temp fix for testing
      .concat('@edgylabs.com');
    //return user.email.includes('@inkco.co');

    //check if user.email includes any of the staff emails
    const result = staffEmails.some((email) => email && user.email.includes(email));

    return result;
  },
  isSmythAlpha: (user) => {
    const allowedEmails = config.env.SMYTH_ALPHA_EMAILS;
    const alphaEmails = allowedEmails.split(',').map((email) => email.trim());
    return alphaEmails.some((email) => email && user.email.includes(email));
  },
};

export default ejsHelper;
