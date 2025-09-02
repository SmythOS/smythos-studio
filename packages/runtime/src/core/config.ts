import dotenv from "dotenv";
dotenv.config();

const config = {
  env: {
    ADMIN_PORT: process.env.ADMIN_PORT || 8080,

    BASE_URL: process.env.BASE_URL,
    SMYTH_API_BASE_URL: process.env.SMYTH_API_SERVER,

    LOGTO_SERVER: process.env.LOGTO_SERVER,
    LOGTO_API_RESOURCE: process.env.LOGTO_API_RESOURCE,
    LOGTO_M2M_APP_ID: process.env.LOGTO_M2M_APP_ID,
    LOGTO_M2M_APP_SECRET: process.env.LOGTO_M2M_APP_SECRET,

    NODE_ENV: process.env?.NODE_ENV,

    AGENT_DOMAIN: process.env?.AGENT_DOMAIN,
    PROD_AGENT_DOMAIN: process.env?.PROD_AGENT_DOMAIN,
    AGENT_DOMAIN_PORT: process.env?.AGENT_DOMAIN_PORT,

    REQ_LIMIT_PER_MINUTE: process.env.REQ_LIMIT_PER_MINUTE || 300,

    UI_SERVER: process.env.UI_SERVER,
    SESSION_SECRET: process.env.SESSION_SECRET,

    DATA_PATH: process.env.DATA_PATH,
  },
};

export default config;
