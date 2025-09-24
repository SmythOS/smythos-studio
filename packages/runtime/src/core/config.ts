import dotenvFlow from 'dotenv-flow';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import expandEnv from 'dotenv-expand';

expandEnv.expand(
  dotenvFlow.config({
    files: ['../../.env', '../.env'],
  }),
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getLocalStoragePath = () => {
  const homeDir = os.homedir();
  return path.join(homeDir, 'smythos-data');
};

const config = {
  env: {
    PORT: parseInt(process.env.RUNTIME_PORT || '5053', 10),
    // Required environment variables
    LOGTO_M2M_APP_SECRET: process.env.LOGTO_M2M_APP_SECRET,
    LOGTO_SERVER: process.env.LOGTO_SERVER,
    LOGTO_API_RESOURCE: process.env.LOGTO_API_RESOURCE,
    MIDDLEWARE_API_BASE_URL: `http://localhost:${process.env.MIDDLEWARE_API_PORT}`,
    NODE_ENV: process.env?.NODE_ENV || 'development',

    ADMIN_PORT: process.env.RUNTIME_ADMIN_PORT || process.env.ADMIN_PORT || 5054,

    BASE_URL: process.env.RUNTIME_URL || `http://localhost:${process.env.RUNTIME_PORT}`,

    LOGTO_M2M_APP_ID: process.env.LOGTO_M2M_APP_ID,

    DEFAULT_AGENT_DOMAIN: process.env?.DEFAULT_AGENT_DOMAIN || 'localagent.stage.smyth.ai',
    AGENT_DOMAIN_PORT: process.env?.AGENT_DOMAIN_PORT,
    PROD_AGENT_DOMAIN: process.env?.PROD_AGENT_DOMAIN,

    REQ_LIMIT_PER_MINUTE: process.env.REQ_LIMIT_PER_MINUTE || 300,
    MAX_CONCURRENT_REQUESTS: process.env.MAX_CONCURRENT_REQUESTS || 50,

    // UI_SERVER: process.env.UI_SERVER || 'http://localhost:4000',
    UI_SERVER: process.env.APP_URL || `http://localhost:${process.env.APP_PORT}` || 'http://localhost:5053',
    SESSION_SECRET: process.env.SESSION_SECRET,

    LOCAL_STORAGE_PATH: getLocalStoragePath(),

    SMYTHOS_SERVER_TYPE: process.env.SMYTHOS_SERVER_TYPE || 'combined',
  },
};

export default config;
