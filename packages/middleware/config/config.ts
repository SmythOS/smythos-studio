/* eslint-disable @typescript-eslint/no-non-null-assertion */
import dotenv from 'dotenv';
import path from 'path';
import Joi from 'joi';
import { version, name } from '../package.json';
import { LOGGER } from './logging';
import { getDirname } from '../src/utils/general';

// const rootPath = require.main?.path;
const rootPath = path.join(getDirname(), '..');
if (!rootPath) {
  process.exit(1);
}
dotenv.config({ path: path.join(getDirname(), '../.env') });

export const config = {
  variables: {
    env: process.env.NODE_ENV,
    port: Number(process.env.PORT),
    ADMIN_PORT: Number(process.env.ADMIN_PORT),
    PINECONE_DEFAULT_INDEX_NAME: process.env.PINECONE_DEFAULT_INDEX_NAME,

    LOGTO_API_DOMAIN: process.env.LOGTO_API_DOMAIN!,
    LOGTO_APP_ID: process.env.LOGTO_APP_ID!,
    LOGTO_APP_SECRET: process.env.LOGTO_APP_SECRET!,
    LOGTO_RESOURCE_INDICATOR: process.env.LOGTO_RESOURCE_INDICATOR!,
    LOGTO_M2M_APP_ID: process.env.LOGTO_M2M_APP_ID!,
    LOGTO_MACHINE_APP_SECRET: process.env.LOGTO_MACHINE_APP_SECRET!,

    SMYTH_PROXY: process.env.SMYTH_PROXY!,
    SMYTH_AGENT_RUNTIME_API: process.env.SMYTH_AGENT_RUNTIME_API!,

    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_SES_SENDING_EMAIL: process.env.AWS_SES_SENDING_EMAIL,
    AWS_SES_ARN: process.env.AWS_SES_ARN,
    AWS_REGION: process.env.AWS_REGION,
    FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL,

    REDIS_CLUSTER_SENTINELS: process.env.REDIS_CLUSTER_SENTINELS,
    REDIS_CLUSTER_MASTER_NAME: process.env.REDIS_CLUSTER_MASTER_NAME,
    REDIS_CLUSTER_PASSWORD: process.env.REDIS_CLUSTER_PASSWORD,

    SMYTH_API_KEY: process.env.SMYTH_API_KEY,
    DOMAIN_REGISTERATION_TARGET: process.env.DOMAIN_REGISTERATION_TARGET,

    DATABASE_URL_READONLY_USER: process.env.DATABASE_URL_READONLY_USER,
    DATABASE_URL: process.env.DATABASE_URL!,
    LOGS_DATABASE_URL: process.env.LOGS_DATABASE_URL!,

    PUSHGATEWAY_URL: process.env.PUSHGATEWAY_URL,
  },

  package: {
    name,
    version,
  },
};
