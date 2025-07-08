import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import config from '../../config';
import apiRouter from './api/router';

const router = express.Router();

// #region  PROXY ROUTES
router.post(
  '/v1/subscriptions/_external/webhook/stripe',
  express.raw({ type: 'application/json' }),
  createProxyMiddleware({
    target: config.env.SMYTH_API_BASE_URL,
    // pathRewrite: {},
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      // Forward the raw body for Stripe signature verification
      proxyReq.setHeader('Content-Type', 'application/json');
      // @ts-ignore
      proxyReq.setHeader('Content-Length', Buffer.byteLength(req.rawBody));
      // @ts-ignore
      proxyReq.write(req.rawBody);
    },
  }),
);

router.use(
  ['/_sysapi/v1/subscriptions*', '/_sysapi/v1/plans*', '/_sysapi/v1/teams*'],
  express.raw({ type: 'application/json' }),
  createProxyMiddleware({
    target: config.env.SMYTH_API_BASE_URL,
    // pathRewrite: {},
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      // Forward the raw body for Stripe signature verification
      proxyReq.setHeader('Content-Type', 'application/json');
      // @ts-ignore
      proxyReq.setHeader('Content-Length', Buffer.byteLength(req.rawBody));
      // @ts-ignore
      proxyReq.write(req.rawBody);
    },
  }),
);
// #endregion

// public API
router.use('/public/api/v1', apiRouter);

export default router;
