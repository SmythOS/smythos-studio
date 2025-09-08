import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import httpStatus from 'http-status';
import swaggerUi from 'swagger-ui-express';
import { config } from '../config/config';
import systemSwaggerDocument from '../docs/_sysapi.swagger.json';
import appSwaggerDocument from '../docs/swagger.json';
import { errorHandler } from './middlewares/error.middleware';
import { infoLogger } from './middlewares/info-logger.middleware';
import { routes } from './routes/v1';
import { systemRoutes } from './routes/v1/_sysapi';
import ApiError from './utils/apiError';

const app = express();

app.use(helmet());

// app.use(appLimiter);
// parse json request body
app.use(
  express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
      // @ts-ignore
      // const url = req.originalUrl;
      // @ts-ignore
      req.rawBody = buf; // for webhooks signature verification
    },
  }),
);

if (config.variables.env !== 'production') {
  // #region  server swagger docs

  // server m2m swagger docs (system routes)
  app.use('/_sysapi/api-docs', swaggerUi.serveFiles(systemSwaggerDocument, {}), swaggerUi.setup(systemSwaggerDocument));
  app.use('/api-docs', swaggerUi.serveFiles(appSwaggerDocument, {}), swaggerUi.setup(appSwaggerDocument));
  // #endregion
}

// parse urlencoded request body
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(infoLogger);

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  }),
);

// v1 api routes
app.use('/v1', routes);
// system/m2m routes
app.use(`/_sysapi/v1`, systemRoutes);

app.get('/health', (_req, res) => {
  res.status(httpStatus.OK).send({
    version: config.package.version,
    name: config.package.name,
  });
});

app.use((_req, _res, next) => {
  console.log(`IP ${_req.ip} tried to call ${_req.originalUrl}`);
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed.  DISABLED for now because of the problem:
// instanceof ApiError is not working in the errorConverter function as it always returns false even if the error is an instance of ApiError
// app.use(errorConverter);

app.use(errorHandler);

export { app };
