import { Router } from 'express';
import { config } from '../../../config/config';
import { userRouter } from '../../modules/user/routes';
import { aiAgentRouter } from '../../modules/ai-agent/routes';
import { embodimentRouter } from '../../modules/embodiment/routes';
import { teamRouter } from '../../modules/team/routes/team.route';
import { subscriptionRouter } from '../../modules/subscription/routes/subscription.route';

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
    route: embodimentRouter,
  },
  {
    rootPath: '/',
    route: subscriptionRouter,
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
