import express from 'express';
import * as path from 'path';
import 'source-map-support/register.js';
//import oauth2Router from './routes/oauth2/router';
import config from './config';
import { apiACLCheck, pageACLCheck } from './middlewares/acl.mw';
import { apiAuth, includeTeamDetails, pageAuth } from './middlewares/auth.mw';
import { errorHandler } from './middlewares/error.mw';
import { sessionCheck } from './middlewares/sessionCheck.mw';
import apiRouter from './routes/api/router';
import dbgRouter from './routes/dbg/router';
import oauthRouter from './routes/oauth/router';
import pagesRouter from './routes/pages/router';
import publicRouter from './routes/public/router';

//import { handleAuthRoutes, withLogto } from '@logto/express';
import { handleAuthRoutes, withLogto } from './logtoHelper';

import cookieParser from 'cookie-parser';
import session from 'express-session';
//import FileStoreLib from 'session-file-store';
import compression from 'compression';
import RedisStore from 'connect-redis';
import passport from 'passport';
import { version } from '../../package.json';
import { maintenanceCheckMiddleware } from './middlewares/maintainceCheck.mw';
import { initializePassport } from './routes/oauth/helper/passportSetup';
import { ModelsPollingService } from './services/ModelsPolling.service';
import { cacheClient } from './services/cache.service';

const PORT = config.env.PORT || 4000;
const app = express();

app.disable('x-powered-by');

app.use(maintenanceCheckMiddleware);

// Allow smythos.com to access the docs
// const corsOptions = {
//   origin: ['http://smythos.com', 'https://smythos.com'],
//   optionsSuccessStatus: 200,
// };

// Serve static files
app.use(compression());
app.use('/', express.static('dist/static'));
app.use('/assets', express.static('dist/assets'));
app.use('/uploads', express.static('uploads'));

app.get('/health', (_, res) => {
  return res.status(200).send({
    success: true,
    version: version,
  });
});

app.use(cookieParser());

const redisStore = new RedisStore({ client: cacheClient.client, prefix: 'smyth_ui_backend:' });
const cookieDays = 30;

if (!config.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set, using default secret for sessions');
}

app.use(
  session({
    store: config.flags.useRedis ? redisStore : undefined,
    secret: config.env.SESSION_SECRET || 'secret123',
    cookie: { maxAge: cookieDays * 24 * 60 * 60 * 1000 },
    saveUninitialized: false,
    resave: false,
  }),
);

//////////////////////
app.use(passport.initialize());
app.use(passport.session());

initializePassport();
app.use(sessionCheck);

//logto logic
const logtoClientConfig = {
  endpoint: config.env.LOGTO_SERVER,
  appId: config.env.LOGTO_APP_ID,
  appSecret: config.env.LOGTO_APP_SECRET,
  baseUrl: config.env.UI_SERVER,
  scopes: ['offline_access', 'profile', 'email', 'openid'],
  //fetchUserInfo: true
  //resource: config.env.LOGTO_API_RESOURCE,

  firstScreen: 'register',
  getAccessToken: true,
};

app.use(handleAuthRoutes(logtoClientConfig));
app.use(withLogto(logtoClientConfig));

app.use(
  express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
      // @ts-ignore
      req.rawBody = buf; // for webhooks signature verification
    },
  }),
);
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

//app.use('/oauth2', apiAuth, oauth2Router);
app.use('/api', [apiAuth, apiACLCheck], apiRouter);
app.use('/dbg', [apiAuth], dbgRouter);
app.use('/oauth', oauthRouter);

app.use('/', publicRouter);

app.use([pageAuth, pageACLCheck, includeTeamDetails]);

// Set EJS as templating engine
app.set('view engine', 'ejs');
// Set views path
app.set('views', path.resolve('views'));

// Application pages
app.use('/', pagesRouter);

//error handling middlewares
app.use(errorHandler);

let server = app.listen(PORT, 'localhost', () => {
  console.log(`Listening on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('An uncaught error occurred!');
  console.error(err.stack);
});

const modelsPollingService = new ModelsPollingService();
modelsPollingService.start();
