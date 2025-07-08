import { createProxyMiddleware } from 'http-proxy-middleware';
import config from '../../config';
import * as userData from '../../services/user-data.service';
import httpProxy from 'http-proxy';

const GRAFANA_URL = config.env.GRAFANA_URL; // Grafana server
const GRAFANA_SA_TOKEN = config.env.GRAFANA_TOKEN;

const modifyResponseBody = async (req, res, proxyRes, proxyResData) => {
  proxyResData = proxyResData.toString('utf8');
  if (req?.query && req.query['var-teamId']) {
    if (req._team.id != req.query['var-teamId']) {
      proxyResData = 'Not Found'; //Forbidden
      return proxyResData;
    }
  }
  if (req?.query && req.query['var-AgentID']) {
    const id = req.query['var-AgentID'];
    if (id != 'ALL') {
      const token = req.user.accessToken;

      //we try to read the agent in order to check if it belongs to the current team
      const result: any = await userData
        .getAgentLockStatus(token, id)
        .catch((error) => ({ error }));
      if (!result || result.error) {
        proxyResData = 'Not Found'; //Forbidden
      }
    }
  }
  if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/html')) {
    //const data = proxyResData.toString('utf8');
    //only rewrite html content
    // if (!req.path.includes('/grafana/d/')) {
    //     proxyResData = 'Not Found'; //Forbidden
    //     return proxyResData;
    // }
  }
  //inject a script before </body>
  proxyResData = proxyResData.replace(
    '</head>',
    '<script src="/js/grafana-proxy.js"></script></head>',
  );

  return proxyResData;
};

// Proxy configuration for Grafana
const proxyConfig: any = {
  target: GRAFANA_URL,
  changeOrigin: true,
  ws: true, // WebSocket support
  logLevel: 'silent',
  pathRewrite: function (path, req) {
    //rewrite the path to force var-teamId query string value to be the current team (req._team.id)
    if (req?.query && req.query['var-teamId']) {
      const teamId = req._team.id;
      const url = new URL(path, 'http://localhost');
      url.searchParams.set('var-teamId', teamId);
      path = url.pathname + url.search;
    }

    return path;
  },

  selfHandleResponse: true, // We will handle the response
  onProxyRes: (proxyRes, req, res) => {
    let originalBody = Buffer.from('');

    proxyRes.on('data', (data) => {
      originalBody = Buffer.concat([originalBody, data]);
    });

    proxyRes.on('end', async () => {
      const modifiedBody = await modifyResponseBody(req, res, proxyRes, originalBody);
      res.write(modifiedBody);
      res.end();
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward the Host header
    // if (req.path.includes('query')) {
    // }

    proxyReq.setHeader('X-Forwarded-For', req.headers.host);

    // Forward the X-Forwarded-* headers
    //proxyReq.setHeader('X-Real-IP', req.headers['x-real-ip']);
    //proxyReq.setHeader('X-Forwarded-For', req.headers['x-forwarded-for']);
    //proxyReq.setHeader('X-Forwarded-Proto', req.headers['x-forwarded-proto']);

    // If there's an upgrade header (for WebSocket support)
    if (req.headers.upgrade) {
      proxyReq.setHeader('Connection', 'upgrade');
      proxyReq.setHeader('Upgrade', req.headers.upgrade);
    }

    // Forward the Authorization header if it's set
    //if (req.headers.authorization) {
    //proxyReq.setHeader('Authorization', req.headers.authorization);
    //}
    proxyReq.setHeader('X-WEBAUTH-USER', `proxy_user`);
    //const accessToken = req.user.accessToken;
    //console.log('Grafana', req._team);
    //proxyReq.setHeader('Authorization', 'Bearer ' + accessToken);
  },
};

const grafanaProxy = createProxyMiddleware(proxyConfig);

export default grafanaProxy;
