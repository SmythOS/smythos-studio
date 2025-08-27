import express from 'express';
import { llmModelsLoaderMiddleware } from '../../../backend/middlewares/llmModelsLoader.mw';
import * as userData from '../../../backend/services/user-data.service';
import { getUserSettingsByKey } from '../../../backend/utils/api.utils';
import { SMYTHOS_DOCS_URL } from '../../../shared/constants/general';
import config from '../../config';
import ejsHelper from '../../ejsHelper';
import { UserSettingsKey } from '../../types/user-data';
import builderSidebar from './builder-sidebar';
import { getNavPages, profilePages } from './menus';
import { checkOnboarding as checkOnboardingMW } from './onboarding.mw';

const router = express.Router();

const getPageAccess = (pageAcl: any, apiAcl: any, url: string) => {
  const baseRoute = url?.split('/:')?.[0];
  return {
    read:
      pageAcl?.[baseRoute]?.access === 'r' ||
      pageAcl?.[baseRoute]?.access === 'rw' ||
      apiAcl?.[baseRoute]?.access === '',
    write: pageAcl?.[baseRoute]?.access === 'rw',
  };
};

const getProfilePages = (pageAcl: any, apiAcl: any, profilePages: any[]) => {
  return profilePages?.filter((p) => {
    if (p.url === '/my-plan') {
      const access = getPageAccess(pageAcl, apiAcl, p.url);
      return access?.read;
    } else {
      return p.url !== '/teams/members' && p.url !== '/teams/settings' && p.url !== '/teams/roles';
    }
  });
};

router.use(async (req, res, next) => {
  res.locals.currentUrl = req.path;
  res.locals.ejsHelper = ejsHelper;
  res.locals.user = req._user;
  res.locals.navPages = getNavPages(getPageAccess, req._user?.acls?.page, req._user?.acls?.api);
  res.locals.profilePages = getProfilePages(
    req._user?.acls?.page,
    req._user?.acls?.api,
    profilePages,
  );
  res.locals.env = config.env.NODE_ENV;
  res.locals.isSmythStaff = ejsHelper.isSmythStaff(req._user);
  res.locals.isSmythAlpha = ejsHelper.isSmythAlpha(req._user);
  res.locals.postHogSignupEvents = [];
  res.locals.isCallBooked = true;
  res.locals.SMYTHOS_DOCS_URL = SMYTHOS_DOCS_URL;
  next();
});

router.get('/', async (req, res) => {
  try {
    const agents: any = await userData.getAgents(req).catch((error) => ({ error }));

    res.render('index', {
      page: 'agents',
      agents: agents || [],
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).send('Error fetching agents');
  }
});

router.get('/builder', checkOnboardingMW, llmModelsLoaderMiddleware, async (req, res) => {
  // const redirected = await checkOnboarding(req, res, true, '/builder');
  // if (!redirected.redirected) {
  const plan = req?._team?.subscription?.plan || null;
  res.render('index', {
    page: 'builder',
    agentId: '',
    menu: builderSidebar,
    showTopMenuBar: false,
    plan,
    ...res.locals.ejsOnboardingData,
  });
  // }
});

router.get('/builder/:agentId', checkOnboardingMW, llmModelsLoaderMiddleware, async (req, res) => {
  const agentId = req.params.agentId;
  let agentAvatar = null;
  let agentData = null;
  let plan = null;
  try {
    try {
      plan = req?._team?.subscription?.plan || null;
      agentAvatar = await userData.getAgentSettings(req, agentId, 'avatar');
      const { agent } = await userData.getAgent(req, agentId);
      agentData = { ...agent };
    } catch (error) {
      console.error('Error fetching agent:', error);
    }

    res.render('index', {
      page: 'builder',
      agentId: req.params.agentId,
      menu: builderSidebar,
      showTopMenuBar: false,
      agent: agentData ? { ...agentData, avatar: agentAvatar } : { avatar: agentAvatar },
      plan,
      ...res.locals.ejsOnboardingData,
    });
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).send('Error fetching agent');
  }
});
router.get('/logs/:agentId', async (req, res) => {
  const { agentId } = req.params;
  res.render('index', {
    page: 'logs',
    agentId,
    menu: builderSidebar,
    tag: req.query?.tag || '',
    sessionID: req.query?.sessionID || '',
    showTopMenuBar: true,
    isSmythStaff: res.locals.isSmythStaff,
    isSmythAlpha: res.locals.isSmythAlpha,
  });
});

// router.get('/doc', (req, res) => {
//   res.render('index', { page: 'doc', showTopMenuBar: true });
// });

export function createReactRoute(
  args?: object | ((req: express.Request, res: express.Response) => object),
) {
  const devServer = {
    url: process.env.VITE_WEBAPP_V2_URL,
    page: 'webappv2',
  };

  return (req: express.Request, res: express.Response) => {
    // if local mode flag is true and the server has localhost in the url, then redirect to the vite dev server
    if (config.env.LOCAL_MODE === 'true' && req.hostname.includes('localhost')) {
      // redirect to the vite dev server
      const fullUrl = `${devServer.url}${req.originalUrl}`;
      return res.redirect(fullUrl);
    }

    let _args = args;
    if (typeof args === 'function') {
      _args = args(req, res);
    }
    res.render('index', { ..._args, page: devServer.page, ...res.locals.ejsOnboardingData });
  };
}

/*
we should make all react routes go through the CATCH ALL ROUTE at the end of the file and these pre-checks on some routes like in /agents
should be handled in a middleware instead of checking in each route!!
*/

//#region React Routes

router.get('/domains', checkOnboardingMW, createReactRoute());
router.get(
  '/agents',
  async (req, res, next) => {
    try {
      const { switchteamid } = req.query;

      // Handle team switching
      if (switchteamid) {
        try {
          const currentTeam = await getUserSettingsByKey(
            req.user.accessToken,
            UserSettingsKey.UserTeam,
          );

          // Only switch teams if the team is different
          if (currentTeam !== switchteamid) {
            await userData.putUserSettings(
              req.user.accessToken,
              UserSettingsKey.UserTeam,
              switchteamid,
            );
          }
        } catch (teamError) {
          console.error('Error switching teams:', teamError);
          return next(teamError);
        }
      }
    } catch (error) {
      console.error('Error in /agents route:', error);
      return next(error);
    }
    return next();
  },
  checkOnboardingMW,
  async (req, res, next) => {
    try {
      return createReactRoute()(req, res);
    } catch (error) {
      console.error('Error in /agents route:', error);
      return next(error);
    }
  },
);
router.get('/templates', checkOnboardingMW, createReactRoute());
router.get('/teams/accept-invitation/:invitationId', createReactRoute({ hideTopMenu: true }));

router.get('/plans', checkOnboardingMW, createReactRoute({ includeTracking: true }));

// Routes for your enterprise tier v4 pages:
router.get('/enterprise-t1', createReactRoute({ includeTracking: true }));
router.get('/enterprise-t2', createReactRoute({ includeTracking: true }));
router.get('/enterprise-t3', createReactRoute({ includeTracking: true }));
router.get('/enterprise-t4', createReactRoute({ includeTracking: true }));
router.get('/partner', createReactRoute({ includeTracking: true }));

router.get('/subscriptions/:priceId', createReactRoute());
router.get('/subscriptions', createReactRoute());

router.get('/chat', createReactRoute({ hideTopMenu: true }));

router.get('/chat/:agentId', createReactRoute({ hideTopMenu: true }));

router.get('/chat/:agentId/chat/:chatId', createReactRoute({ hideTopMenu: true }));

router.get('/agent-settings/:agentId', llmModelsLoaderMiddleware, createReactRoute());

router.get('/agent-settings/:agentId/bulk/:componentId', createReactRoute());

router.get(
  '/welcome',
  checkOnboardingMW,
  createReactRoute({ hideTopMenu: true, includeTracking: true }),
);

router.get(
  '/welcome/:subpage',
  checkOnboardingMW,
  createReactRoute({ hideTopMenu: true, includeTracking: true }),
);

router.use('/account-deleted', createReactRoute({ env: config.env.NODE_ENV, hideTopMenu: true }));

router.get('/vault', checkOnboardingMW, createReactRoute());

//#endregion

/**
 * Route to print user token.
 * Only accessible if the user is a staff user and the environment is development.
 */
router.get('/account/access', (req, res) => {
  // Check if the user is a staff member and the environment is development
  if (res.locals.isSmythStaff && config.env.NODE_ENV === 'DEV') {
    const { accessToken } = req.user;
    res.send({ success: true, token: accessToken });
  } else {
    res.status(404).send({ success: false, error: 'Not Found' });
  }
});

router.get('/_auth', async (req, res) => {
  res.send('<script>window.close();</script>');
});
router.get('/error/:code', (req, res) => {
  const { code } = req.params;
  let { message } = req.query;

  const statusCode = parseInt(code) || 500;
  //message = 'Unknown Error';
  if (!message) {
    switch (code) {
      case '404':
        message = 'Resource Not Found';
        break;
      case '400':
        message = 'Bad Request';
        break;
      case '500':
        message = 'Internal Error';
        break;
      default:
        message = 'Unknown Error';
    }
  }
  res.status(statusCode).render('index', {
    page: 'error',
    error: { code, message },
    showTopMenuBar: true,
  });
});

//* All React Routes SHOULD NOW BE HANDLED BY WEBAPP V2 Route that matches non-existing routes
//* NEW: catch all rest of new React routes and serve react app
router.get(/^\/(?!.*\.\w+$).*$/, createReactRoute());

export default router;
