import axios from 'axios';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import config from '../../config';
import { WEAVER_FREE_LIMIT } from '../../constants';
import { includeTeamDetails } from '../../middlewares/auth.mw';
import { cacheClient } from '../../services/cache.service';
import { isSmythAlpha, isSmythStaff } from '../../utils';
import { isCustomLLMAllowed } from '../../utils/customLLM';
import agentRouter from './agent/router';
import componentRouters from './component/index';
import { feedbackRouter } from './page/feedback';
import pageRouters from './page/index';
import { teamSettingsRouter } from './team-settings/router';
import uploadRouter from './upload/datasource.upload';
import { userSettingsRouter } from './user-settings/router';

const router = express.Router();

router.use('/agent', agentRouter);

const componentProxy: any = createProxyMiddleware({
  target: config.env.API_SERVER, // the target server
  changeOrigin: true, // needed for virtual hosted sites
  // pathRewrite: {
  //     '^/component': '', // remove the /proxy prefix when forwarding
  // },
  onProxyReq: (proxyReq, req: any, res) => {
    // Log the full URL to which the request is redirected
    const targetUrl = `//${proxyReq.getHeader('host')}${proxyReq.path}`;
    console.log(`Redirecting to: ${targetUrl}`);

    const accessToken = req.user.accessToken;
    proxyReq.setHeader('Authorization', 'Bearer ' + accessToken);

    // Remove the Cookie header
    proxyReq.removeHeader('Cookie');
  },
});
//this is a code that we'll keep here during the transition from backend components APIs to remote components APIs
router.use('/component/:cptName', (req, res, next) => {
  const cptName = req.params.cptName;
  // Check if the router exists in the routers index
  if (componentRouters[cptName]) {
    // Use the selected router
    componentRouters[cptName](req, res, next);
  } else {
    //res.status(404).send('Component API not found');
    componentProxy(req, res, next);
  }
});
router.use('/component', componentProxy);

router.use('/', uploadRouter);

router.use('/page/feedback', feedbackRouter);

router.use('/page/:pageName', (req, res, next) => {
  const pageName = req.params.pageName;
  // Check if the router exists in the routers index
  if (pageRouters[pageName]) {
    // Use the selected router
    pageRouters[pageName](req, res, next);
  } else {
    res.status(404).send({ error: 'Page API not found : ' + pageName });
  }
});

router.get('/user', async (req, res) => {
  res.json({ ...req.user });
});

router.use('/app/user-settings', userSettingsRouter);
router.use('/app/team-settings', teamSettingsRouter);

router.get('/status', includeTeamDetails, async (req, res) => {
  const url = `${config.env.API_SERVER}/health`;
  const userEmail = req._user.email;
  const teamId = req?._team?.id;
  const parentTeamId = req?._team?.parentId || teamId;

  const user: {
    acl: Record<string, string>;
    email: string;
    isSmythStaff: boolean;
    isSmythAlpha: boolean;
    isCustomLLMAllowed: boolean;
    weaver?: {
      requests: {
        remaining: number;
        startedAt?: string;
        nextRequestTime?: string;
      };
    };
  } = {
    acl: {},
    email: userEmail,
    isSmythStaff: isSmythStaff(req._user),
    isSmythAlpha: isSmythAlpha(req._user),
    isCustomLLMAllowed: isCustomLLMAllowed(userEmail),
  };

  // #region for free users, we need to add remaining requests inside the user object
  const isFreeUser = req._team?.subscription?.plan.isDefaultPlan;
  if (isFreeUser) {
    const userId = req._user.id;
    const redisKey = `${WEAVER_FREE_LIMIT.countKeyPrefix}${userId}`;
    const weaverRequestsCount = (await cacheClient.get(redisKey)) || '0';
    const remainingRequests = WEAVER_FREE_LIMIT.max - parseInt(weaverRequestsCount);

    const weaverRequestStartedAt =
      (await cacheClient.get(`${WEAVER_FREE_LIMIT.startedAtKeyPrefix}${userId}`)) || '';

    user.weaver = {
      requests: {
        remaining: remainingRequests >= 0 ? remainingRequests : 0,
      },
    };

    if (weaverRequestStartedAt) {
      user.weaver.requests.startedAt = weaverRequestStartedAt;
      // Calculate next request time (reset time) - 1 day after startedAt
      const startedAtDate = new Date(weaverRequestStartedAt);
      const nextRequestTime = new Date(startedAtDate.getTime() + WEAVER_FREE_LIMIT.windowMs);
      user.weaver.requests.nextRequestTime = nextRequestTime.toISOString();
    }
  }
  // #endregion

  const team = {
    id: teamId,
    parentId: parentTeamId,
    // TODO: remove this once we have a proper way to check if the team is on a legacy plan, using this flag for now  (legacy plan doesnot have credits and we need it for serverless code component)
    isLegacyPlan: !(
      req._team?.subscription?.plan?.properties?.flags?.hasBuiltinModels ||
      req._team?.subscription?.plan.isDefaultPlan
    ),
  };

  for (let key in req._user.acls.page) {
    const rule = req._user.acls.page[key];
    if (rule.access) {
      user.acl[key] = rule.access;
    }
  }
  //check url connectivity
  try {
    //checking url connectivity
    const result: any = await axios.get(url);

    res.json({
      status: {
        user,
        team,
        server: 'Online',
        env: config.env.NODE_ENV,
        agent_domain: result?.data?.agent_domain,
        frontUrl: config.env.UI_SERVER,
        url: config.env.PUB_API_SERVER || config.env.API_SERVER,
        dbg_url: `${config.env.UI_SERVER}/dbg`,
        doc_url: config.env.DOC_SERVER,
        prod_agent_domain: config.env.PROD_AGENT_DOMAIN,
      },
    });
  } catch (error) {
    res.json({
      status: { user, team, prod_agent_domain: config.env.PROD_AGENT_DOMAIN, server: 'Offline' },
    });
  }
});

export default router;
