import { Router } from 'express';
import { config } from '../../../config/config';
import { aiAgentRouter } from '../../modules/ai-agent/routes';
import { domainRouter } from '../../modules/domains/routes/domain-registeration.route';
import { embodimentRouter } from '../../modules/embodiment/routes';
import { subscriptionRouter } from '../../modules/subscription/routes/subscription.route';
import { teamRouter } from '../../modules/team/routes/team.route';
import { userRouter } from '../../modules/user/routes';

import { vaultRouter } from '../../modules/vault/routes/vault.route';

const mainRouter = Router();

type Route = {
  rootPath: string;
  route: Router;
  requireAuth?: boolean;
};

const defaultRoutes: Route[] = [
  {
    rootPath: '/user',
    route: userRouter,
  },
  {
    rootPath: '/',
    route: teamRouter,
  },
  {
    rootPath: '/',
    route: aiAgentRouter,
  },
  {
    rootPath: '/',
    route: domainRouter,
  },
  {
    rootPath: '/',
    route: embodimentRouter,
  },
  {
    rootPath: '/',
    route: subscriptionRouter,
  },
  {
    rootPath: '/vault',
    route: vaultRouter,
  },
];

const devRoutes: Route[] = [];

defaultRoutes.forEach(route => {
  mainRouter.use(route.rootPath, route.route);
});

if (config.variables.env === 'development') {
  devRoutes.forEach(route => {
    mainRouter.use(route.rootPath, route.route);
  });
}

export { mainRouter as routes };
