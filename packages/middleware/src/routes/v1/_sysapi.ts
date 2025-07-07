import { Router } from 'express';
import { config } from '../../../config/config';
import { _aiAgentRouter } from '../../modules/ai-agent/routes/_sysapi';
import { _vectorRouter } from '../../modules/vector/routes/_sysapi/vector.route';
import { _domainRouter } from '../../modules/domain-registeration/routes/_sysapi/domain-registeration.route';
import { _embodimentRouter } from '../../modules/embodiment/routes/_sysapi';
import { _teamRouter } from '../../modules/team/routes/_sysapi/team.route';

import { authMiddlewareFactory } from '../../modules/auth/middlewares/auth.middleware';
import { _subscriptionRouter } from '../../modules/subscription/routes/_sysapi/subscription.route.m2m';
import { _planM2MRouter } from '../../modules/subscription/routes/_sysapi/plan.route.m2m';
import { _appConfigRouter } from '../../modules/app-config/routes/_sysapi';
import { _userRouter } from '../../modules/user/routes/_sysapi';
import { _quotaRouter } from '../../modules/quota/routes/_sysapi';

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
    route: _vectorRouter,
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
    route: _planM2MRouter,
  },
  {
    rootPath: '/',
    route: _appConfigRouter,
  },
  {
    rootPath: '/',
    route: _userRouter,
  },
  {
    rootPath: '/',
    route: _quotaRouter,
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
