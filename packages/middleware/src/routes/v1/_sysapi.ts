import { Router } from 'express';
import { config } from '../../../config/config';
import { _aiAgentRouter } from '../../modules/ai-agent/routes/_sysapi';
import { _embodimentRouter } from '../../modules/embodiment/routes/_sysapi';
import { _teamRouter } from '../../modules/team/routes/_sysapi/team.route';

import { authMiddlewareFactory } from '../../modules/auth/middlewares/auth.middleware';
import { _domainRouter } from '../../modules/domains/routes/_sysapi/domain-registeration.route';
import { _subscriptionRouter } from '../../modules/subscription/routes/_sysapi/subscription.route.m2m';
import { _userRouter } from '../../modules/user/routes/_sysapi';

const mainRouter = Router();

type Route = {
  rootPath: string;
  route: Router;
  requireAuth?: boolean;
};

const defaultRoutes: Route[] = [
  {
    rootPath: '/',
    route: _aiAgentRouter,
  },
  {
    rootPath: '/',
    route: _teamRouter,
  },
  {
    rootPath: '/',
    route: _domainRouter,
  },
  {
    rootPath: '/',
    route: _embodimentRouter,
  },

  {
    rootPath: '/',
    route: _subscriptionRouter,
  },
  {
    rootPath: '/',
    route: _userRouter,
  },
];

const devRoutes: Route[] = [];

// PROTECT ALL SYSTEM ROUTES
mainRouter.use(
  authMiddlewareFactory({
    allowM2M: true,
    limitToM2M: true,
  }),
);

defaultRoutes.forEach(route => {
  mainRouter.use(route.rootPath, route.route);
});

if (config.variables.env === 'development') {
  devRoutes.forEach(route => {
    mainRouter.use(route.rootPath, route.route);
  });
}

export { mainRouter as systemRoutes };
