import express from 'express';
import ejsHelper from '../ejsHelper';
import config from '../config';

export async function sessionCheck(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const { code, state, iss } = req.query;
  if (req.path === '/logto/sign-in-callback') {
    if (!code || !state || !iss || !req.session.signInSession) {
      delete req.session.pendingPath;
      return res.status(401).render('index', {
        menu: {},
        page: 'error',
        ejsHelper: ejsHelper,
        currentUrl: req.path,
        user: req.user,
        error: { code: 401, message: 'Invalid Session' },
        navPages: [],
        profilePages: [],
        env: config.env.NODE_ENV,
      });
    }
  }
  next();
}
