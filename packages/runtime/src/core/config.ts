import dotenv from "dotenv";
dotenv.config();

const config = {
  env: {
    PORT: parseInt(process.env.PORT || "5053"),
    // Required environment variables
    LOGTO_M2M_APP_SECRET: process.env.LOGTO_M2M_APP_SECRET,
    LOGTO_SERVER: process.env.LOGTO_SERVER,
    LOGTO_API_RESOURCE: process.env.LOGTO_API_RESOURCE,
    MIDDLEWARE_API_BASE_URL: process.env.MIDDLEWARE_API_BASE_URL,
    NODE_ENV: process.env?.NODE_ENV || "development",

    ADMIN_PORT: process.env.ADMIN_PORT || 5054,

    BASE_URL: process.env.BASE_URL || "http://localhost:5053",

    LOGTO_M2M_APP_ID: process.env.LOGTO_M2M_APP_ID,

    AGENT_DOMAIN: process.env?.AGENT_DOMAIN,
    PROD_AGENT_DOMAIN: process.env?.PROD_AGENT_DOMAIN,
    AGENT_DOMAIN_PORT: process.env?.AGENT_DOMAIN_PORT,

    REQ_LIMIT_PER_MINUTE: process.env.REQ_LIMIT_PER_MINUTE || 300,
    MAX_CONCURRENT_REQUESTS: process.env.MAX_CONCURRENT_REQUESTS || 10,

    UI_SERVER: process.env.UI_SERVER || "http://localhost:4000",
    SESSION_SECRET: process.env.SESSION_SECRET,

    CODE_SANDBOX_URL: process.env.CODE_SANDBOX_URL || "http://localhost:5055",

    DATA_PATH: process.env.DATA_PATH,

    SMYTHOS_SERVER_TYPE: process.env.SMYTHOS_SERVER_TYPE || "combined",
  },
};

export default config;
