import cors from 'cors';

import config from '@core/config';

// Minimal CORS - allow everything in development, configurable for production
const embDomainsScheme = process.env.ENABLE_TLS ? 'https' : 'http';
const embDomains = [config.env.PROD_AGENT_DOMAIN, config.env.DEFAULT_AGENT_DOMAIN].map(domain => `${embDomainsScheme}://${domain}`);
const allowedDomains = [...embDomains, config.env.UI_SERVER, config.env.BASE_URL];
const corsOptions: cors.CorsOptions = {
  origin: process.env.NODE_ENV === 'production' ? allowedDomains : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Conversation-Id', 'X-Auth-Token', 'X-Parent-Cookie', 'X-Monitor-Id'],
};

export default cors(corsOptions);
