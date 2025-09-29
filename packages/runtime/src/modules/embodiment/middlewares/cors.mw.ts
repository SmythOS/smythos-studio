import cors from 'cors';

import { Agent, Logger } from '@smythos/sre';

import config from '@core/config';
import { EMBODIMENT_TYPES } from '@embodiment/constants';

const console = Logger('[Embodiment] Middleware: CORS');

// Custom CORS middleware
// FIXME : make default CORS configurable from .env file
const corsOptionsDelegate = async (req, callback) => {
  const embodimentType = req.originalUrl.includes('form-preview') ? EMBODIMENT_TYPES.FormPreview : EMBODIMENT_TYPES.ChatBot;

  // default origins are the origins that are allowed to make requests to the server
  const defaultOrigins = [config.env.UI_SERVER, 'http://localhost', 'https://localhost'];
  let agentAllowedDomains = []; // agent allowed domains are the origins that user has specified in the embodiment configuration
  const allAllowedOrigins = [...defaultOrigins];

  // *** ADD MORE HOSTS TO ALLOW AS NEEDED ***
  const knownHosts = ['localhost'];

  let corsOptions;

  if (req._agent) {
    const agent: Agent = req._agent;

    // wait for agent embodiments to be ready
    await agent.agentSettings?.embodiments?.ready();

    agentAllowedDomains = agent.agentSettings?.embodiments?.get(embodimentType, 'allowedDomains');

    if (!agentAllowedDomains || !Array.isArray(agentAllowedDomains)) agentAllowedDomains = [];
    agentAllowedDomains = agentAllowedDomains.map(domain => {
      if (domain?.startsWith('http')) {
        try {
          return new URL(domain)?.origin;
        } catch (error) {
          return domain;
        }
      }

      return `https://${domain}`;
    });
    if (agentAllowedDomains && agentAllowedDomains.length > 0) {
      allAllowedOrigins.push(...agentAllowedDomains);
    }
  }
  const origin = req.get('Origin');
  const host = req.get('Host');

  // check if the origin is the same as the host
  const isSameOrigin = origin === `http://${host}` || origin === `https://${host}`;

  const currentHost = new URL(config.env.BASE_URL || '').host;

  // bypass allowed hosts for CORS because they send debug requests
  const isKnownHost = host == currentHost || knownHosts.includes(host);

  const isAllowedOrigin = allAllowedOrigins.includes(origin);

  const allowAllOrigins = agentAllowedDomains?.length === 0; // if user has not specified any allowed domains, allow all origins

  if (isKnownHost || isSameOrigin || isAllowedOrigin || allowAllOrigins) {
    // Enable CORS for the same origin and the allowed domains
    corsOptions = {
      origin: true,
      credentials: true, // Allow credentials (cookies, etc.)
      methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Conversation-Id', 'X-Auth-Token', 'X-Parent-Cookie'],
    };
  } else {
    // Disable CORS for other requests
    corsOptions = { origin: false };
    if (req.method == 'OPTIONS') {
      console.log('CORS check ', { path: req.path, host, origin }, '==> Denied ');
      console.log('Allowed Domains for this request ', allAllowedOrigins);
    }
  }

  callback(null, corsOptions);
};

const middleware = cors(corsOptionsDelegate);

export default middleware;
