import express from 'express';
import templateAcls from '../../shared/constants/acl.constant.json';
import { userSettingKeys } from '../../shared/userSettingKeys';
import config from '../config';
import ejsHelper from '../ejsHelper';
import { navPages, profilePages } from '../routes/pages/menus';
import * as userData from '../services/user-data.service';
import { TeamUserRole } from '../types/smyth-middleware';
import { authHeaders, smythAPIReq } from '../utils';
import * as aclsUtils from '../utils/acls.utils';

const FULL_ACCESS_ACLs = aclsUtils.giveAllAclRulesRW(templateAcls);

/**
 * Renders an error page with the given status code and message.
 * @param res - Express response object
 * @param req - Express request object
 * @param statusCode - HTTP status code
 * @param errorMessage - Error message to display
 * @returns void
 */
function renderErrorPage(
  res: express.Response,
  req: express.Request,
  statusCode: number,
  errorMessage: string,
): void {
  return res.status(statusCode).render('index', {
    menu: {},
    page: 'error',
    ejsHelper,
    currentUrl: req.path,
    navPages,
    profilePages,
    user: req._user,
    error: { code: statusCode, message: errorMessage },
    env: config.env.NODE_ENV,
  });
}

async function getTeamInfo(req: express.Request | any, isRetry: boolean = false) {
  const token = req.user.accessToken;
  const teamInfo: any = await smythAPIReq
    .get('/teams/roles/me', await authHeaders(req))
    .catch((error) => ({ error }));
  if (teamInfo.error) {
    if (teamInfo.error?.response?.status === 401) {
      //delete user from session
      req.session.destroy(function (err) {
        if (err) {
          // handle error
        } else {
          // session destroyed, redirect or perform other actions
          console.log('invalid session, redirecting to login');
        }
      });

      return { redirect: true };
    } else if (
      teamInfo.error.response?.status === 403 &&
      !isRetry &&
      teamInfo.error.response?.data?.message === 'You do not have access to this team'
    ) {
      await userData.putUserSettings(token, userSettingKeys.USER_TEAM, '');
      return getTeamInfo(req, true);
    } else {
      throw new Error(
        'Failed to fetch team info:' + JSON.stringify(teamInfo.error?.response?.data),
      );
    }
  }
  return teamInfo;
}

export async function pageACLCheck(
  req: express.Request | any,
  res: express.Response | any,
  next: express.NextFunction,
) {
  if (!req.user.isAuthenticated) {
    return renderErrorPage(res, req, 401, 'Unauthorized');
  }

  const curPage = req.url; //rely on this to check page access
  // const userRole: TeamUserRole = req._user.role;
  const teamInfo = await getTeamInfo(req);
  if (teamInfo?.redirect) {
    return res.redirect('/');
  }

  const userRole: TeamUserRole = teamInfo?.data?.role;

  if (!userRole) {
    console.log('Forbidden: No userRole');
    return renderErrorPage(res, req, 403, 'Forbidden');
  }

  const sharedTeamAcls = aclsUtils.isDefaultRole(userRole.sharedTeamRole?.acl)
    ? aclsUtils.getDefaultRoleAcls(userRole.sharedTeamRole?.acl?.default_role)
    : userRole?.sharedTeamRole?.acl;

  const userHasValidAcls =
    (userRole?.sharedTeamRole?.isOwnerRole ?? false) || aclsUtils.checkAclsValidity(sharedTeamAcls);

  if (!userHasValidAcls) {
    console.log('Forbidden: No valid acls');
    return renderErrorPage(res, req, 403, 'Forbidden');
  }

  // if admin, give full access
  const userAcls = userRole.sharedTeamRole?.isOwnerRole
    ? FULL_ACCESS_ACLs
    : aclsUtils.applyMatchedAclRules(sharedTeamAcls, templateAcls);

  const rule = aclsUtils.getRule(userAcls.page, curPage);

  req._user.acls = userAcls;
  // If we have redirect rule
  if (typeof rule?.redirect === 'string' && rule?.redirect) {
    console.log(
      'Redirecting to:',
      `${rule.redirect}${
        Object.keys(req.query).length ? `?${new URLSearchParams(req.query).toString()}` : ''
      }`,
    );
    return res.redirect(
      301,
      `${rule.redirect}${
        Object.keys(req.query).length ? `?${new URLSearchParams(req.query).toString()}` : ''
      }`,
    );
  }

  // accept both 'rw' and 'r' to pass
  if (rule?.access === 'rw' || rule?.access === 'r') {
    next();
  } else {
    return renderErrorPage(res, req, 403, 'Forbidden');
  }
}

export const exactAPIUrls = ['/page/teams/subteams'];
export const byPassPageRule = ['/user-settings/userTeam'];
export const unrestrictedAPIUrls = ['/app/user-settings/userTeam', '/agent/request-access'];

export async function apiACLCheck(
  req: express.Request | any,
  res: express.Response | any,
  next: express.NextFunction,
) {
  if (!req.user.isAuthenticated) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const curPage = req.header('referrer')?.replace(config.env.UI_SERVER, ''); //rely on this to read the access level
  const teamInfo: any = await smythAPIReq
    .get('/teams/roles/me', await authHeaders(req))
    .catch((error) => ({ error }));
  if (teamInfo.error) {
    if (teamInfo.error?.status === 401 || teamInfo.error?.response?.status === 401) {
      //delete user from session
      req.session.destroy(function (err) {
        if (err) {
          // handle error
        } else {
          // session destroyed, redirect or perform other actions
          console.log('invalid session, redirecting to login');
        }
      });

      return res.redirect('/');
    }
  }

  const userRole: TeamUserRole = teamInfo?.data?.role;

  if (!userRole) {
    return res.status(403).send({ error: 'Forbidden' });
  }

  const sharedTeamAcls = aclsUtils.isDefaultRole(userRole.sharedTeamRole?.acl)
    ? aclsUtils.getDefaultRoleAcls(userRole.sharedTeamRole?.acl?.default_role)
    : userRole?.sharedTeamRole?.acl;

  const userHasValidAcls =
    (userRole?.sharedTeamRole?.isOwnerRole ?? false) || aclsUtils.checkAclsValidity(sharedTeamAcls);

  if (!userHasValidAcls) {
    return res.status(403).send({ error: 'Forbidden' });
  }

  //* if admin, give full access
  const userAcls = userRole.sharedTeamRole.isOwnerRole
    ? FULL_ACCESS_ACLs
    : aclsUtils.applyMatchedAclRules(sharedTeamAcls, templateAcls);

  req._user.acls = userAcls;

  let byPassPageRuleCheck = false;

  for (let i = 0; i < byPassPageRule.length; i++) {
    if (req.url.includes(byPassPageRule[i])) {
      byPassPageRuleCheck = true;
      break;
    }
  }

  let rule = byPassPageRuleCheck ? null : aclsUtils.getRule(userAcls.page, curPage);

  if (!rule?.access) {
    const endpoint = req?.url;
    rule = aclsUtils.getRule(userAcls.api, endpoint, exactAPIUrls.includes(endpoint));
  }
  if (unrestrictedAPIUrls.includes(req.url)) {
    return next();
  }
  // when we have 'r' means readonly, then accept the 'get' method only
  const reqMethod = req.method.toLowerCase();
  if (rule?.access === 'r' && ['get', 'head', 'options'].includes(reqMethod)) {
    next();
  } else if (rule?.access === 'rw') {
    next();
  } else {
    return res.status(403).send({ error: 'Forbidden' });
  }
}

export async function appACLCheck(
  req: express.Request | any,
  res: express.Response | any,
  next: express.NextFunction,
) {
  if (!req.user.isAuthenticated) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const teamInfo: any = await smythAPIReq
    .get('/teams/roles/me', await authHeaders(req))
    .catch((error) => ({ error }));
  if (teamInfo.error) {
    if (teamInfo.error?.status === 401 || teamInfo.error?.response?.status === 401) {
      //delete user from session
      req.session.destroy(function (err) {
        if (err) {
          // handle error
        } else {
          // session destroyed, redirect or perform other actions
          console.log('invalid session, redirecting to login');
        }
      });

      return res.redirect('/');
    }
  }

  const userRole: TeamUserRole = teamInfo?.data?.role;

  if (!userRole) {
    return res.status(403).send({ error: 'Forbidden' });
  }

  const sharedTeamAcls = aclsUtils.isDefaultRole(userRole.sharedTeamRole?.acl)
    ? aclsUtils.getDefaultRoleAcls(userRole.sharedTeamRole?.acl?.default_role)
    : userRole?.sharedTeamRole?.acl;

  const userHasValidAcls =
    (userRole?.sharedTeamRole?.isOwnerRole ?? false) || aclsUtils.checkAclsValidity(sharedTeamAcls);

  if (!userHasValidAcls) {
    return res.status(403).send({ error: 'Forbidden' });
  }

  //* if admin, give full access
  const userAcls = userRole.sharedTeamRole.isOwnerRole
    ? FULL_ACCESS_ACLs
    : aclsUtils.applyMatchedAclRules(sharedTeamAcls, templateAcls);

  req._user.acls = userAcls;

  const endpoint = req?.url;
  let rule = aclsUtils.getRule(userAcls.api, '/app', exactAPIUrls.includes('/app'));

  if (req.url == '/page/teams/subteams') {
    rule = aclsUtils.getRule(userAcls.page, '/teams/subteams');
  }

  // when we have 'r' means readonly, then accept the 'get' method only
  const reqMethod = req.method.toLowerCase();
  if (rule?.access === 'r' && ['get', 'head', 'options'].includes(reqMethod)) {
    next();
  } else if (rule?.access === 'rw') {
    next();
  } else {
    return res.status(403).send({ error: 'Forbidden' });
  }
}
