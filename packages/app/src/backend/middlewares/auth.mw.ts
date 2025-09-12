import express from 'express';
import { Team, TeamUserRole } from '../types/smyth-middleware';
import { authHeaders, smythAPIReq } from '../utils';

export async function pageAuth(
  req: express.Request | any,
  res: express.Response | any,
  next: express.NextFunction,
) {
  if (!req.user.isAuthenticated) {
    req.session.pendingPath = req.originalUrl;
    return res.redirect('/logto/sign-in');
  }
  if (req.session.pendingPath) {
    const pendingPath = req.session.pendingPath;
    delete req.session.pendingPath;
    return res.redirect(pendingPath);
  }
  req._user = req.user.claims;
  req._user.id = req._user.sub;

  // // ! TEMPORARY: will load from DB
  // req._user.acl = ACLs;

  next();
}

export async function apiAuth(
  req: express.Request | any,
  res: express.Response | any,
  next: express.NextFunction,
) {
  if (!req.user.isAuthenticated) {
    return res.status(401).send({ error: 'Unauthorized' });
  }
  req._user = req.user.claims;
  req._user.id = req._user.sub;

  // // ! TEMPORARY: will load from DB
  // req._user.acl = ACLs;
  next();
}

export async function includeTeamDetails(req: any, res: any, next: any) {
  // INFO: this should only be called after apiAuth or pageAuth (basically after user is authenticated)
  try {
    const team: Team = (await smythAPIReq.get('/teams/me', await authHeaders(req))).data.team;
    //TODO: cache team details on redis for faster access (should use a reasonable TTL)
    req._team = team;
    next();
  } catch (error) {
    // console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function includeMyUserRole(req: any, res: any, next: any) {
  // INFO: this should only be called after apiAuth or pageAuth (basically after user is authenticated)
  try {
    const userRole: TeamUserRole = (
      await smythAPIReq.get('/teams/roles/me', await authHeaders(req))
    ).data.role;
    console.log('userRole', userRole);
    req._user.role = userRole;

    next();
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
