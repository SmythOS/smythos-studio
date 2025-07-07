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

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().required().default(3000),
    ADMIN_PORT: Joi.number().required().default(8080),
    HOST: Joi.string().default('http://localhost').optional(),
    CORS_ORIGIN: Joi.string().required().description('CORS_ORIGIN'),
    OPENAI_API_KEY: Joi.string().required().description('OPENAI_API_KEY'),
    LOGTO_API_DOMAIN: Joi.string().required().description('LOGTO_API_DOMAIN'),
    LOGTO_APP_ID: Joi.string().required().description('LOGTO_APP_ID'),
    LOGTO_APP_SECRET: Joi.string().required().description('LOGTO_APP_SECRET'),
    LOGTO_RESOURCE_INDICATOR: Joi.string().required().description('LOGTO_RESOURCE_INDICATOR'),
    LOGTO_MACHINE_APP_SECRET: Joi.string().required().description('LOGTO_MACHINE_APP_SECRET'),
    SMYTH_PROXY: Joi.string().required().description('SMYTH_PROXY'),
    SMYTH_AGENT_RUNTIME_API: Joi.string().required().description('SMYTH_AGENT_RUNTIME_API'),
    PINECONE_DEFAULT_INDEX_NAME: Joi.string().required().description('PINECONE_DEFAULT_INDEX_NAME'),
    AWS_ACCESS_KEY_ID: Joi.string().required().description('AWS_ACCESS_KEY_ID'),
    AWS_SECRET_ACCESS_KEY: Joi.string().required().description('AWS_SECRET_ACCESS_KEY'),
    AWS_SES_SENDING_EMAIL: Joi.string().required().description('AWS_SES_SENDING_EMAIL'),
    AWS_SES_ARN: Joi.string().required().description('AWS_SES_ARN'),
    AWS_REGION: Joi.string().required().description('AWS_REGION'),
    FRONTEND_BASE_URL: Joi.string().required().description('FRONTEND_BASE_URL'),
    REDIS_CLUSTER_SENTINELS: Joi.string().required().description('REDIS_CLUSTER_SENTINELS'),
    REDIS_CLUSTER_MASTER_NAME: Joi.string().required().description('REDIS_CLUSTER_MASTER_NAME'),
    REDIS_CLUSTER_PASSWORD: Joi.string().required().description('REDIS_CLUSTER_PASSWORD'),
    SMYTH_API_KEY: Joi.string().required().description('SMYTH_API_KEY'),
    DOMAIN_REGISTERATION_TARGET: Joi.string().required().description('DOMAIN_REGISTERATION_TARGET'),

    DATABASE_URL_READONLY_USER: Joi.string().required().description('DATABASE_URL_READONLY_USER'),
    DATABASE_URL: Joi.string().required().description('DATABASE_URL'),
    LOGS_DATABASE_URL: Joi.string().required().description('LOGS_DATABASE_URL'),

    PUSHGATEWAY_URL: Joi.string().required().description('PUSHGATEWAY_URL'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  LOGGER.error(new Error(`Config validation error: ${error.message}`));
  process.exit(1);
  // throw new Error(`Config validation error: ${error.message}`);
}

type configType = {
  variables: {
    env: string;
    host: string;
    port: number;
    ADMIN_PORT: number;
    cacheRootDir: string;
    corsOrigin: string;
    PINECONE_DEFAULT_INDEX_NAME: string;
    openAiApiKey: string;

    LOGTO_API_DOMAIN: string;
    LOGTO_APP_ID: string;
    LOGTO_APP_SECRET: string;
    LOGTO_RESOURCE_INDICATOR: string;
    LOGTO_M2M_APP_ID: string;
    LOGTO_MACHINE_APP_SECRET: string;

    SMYTH_PROXY: string;
    SMYTH_AGENT_RUNTIME_API: string;

    AWS_ACCESS_KEY_ID: string;
    AWS_SECRET_ACCESS_KEY: string;
    AWS_SES_SENDING_EMAIL: string;
    AWS_SES_ARN: string;
    AWS_REGION: string;
    FRONTEND_BASE_URL: string;

    REDIS_CLUSTER_SENTINELS: string;
    REDIS_CLUSTER_MASTER_NAME: string;
    REDIS_CLUSTER_PASSWORD: string;

    SMYTH_API_KEY: string;
    DOMAIN_REGISTERATION_TARGET: string;

    STRIPE_WEBHOOK_SECRET_KEY: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_METER_NAME: string;
    STRIPE_V4_SEATS_METER_NAME: string;
    STRIPE_V4_MODAL_USAGE_METER_NAME: string;
    HUBSPOT_API_KEY: string;
    FIRST_PROMOTER_API_KEY: string;

    DATABASE_URL_READONLY_USER: string;
    DATABASE_URL: string;
    LOGS_DATABASE_URL: string;

    PUSHGATEWAY_URL: string;
  };

  package: {
    name: string;
    version: string;
  };
};

export const config: configType = {
  variables: {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    ADMIN_PORT: envVars.ADMIN_PORT,
    host: envVars.HOST,
    cacheRootDir: envVars.NODE_ENV === 'development' ? path.join(getDirname(), '..', 'tmp') : path.join('/opt', 'cache'),
    corsOrigin: envVars.CORS_ORIGIN,
    openAiApiKey: envVars.OPENAI_API_KEY,
    PINECONE_DEFAULT_INDEX_NAME: envVars.PINECONE_DEFAULT_INDEX_NAME,

    LOGTO_API_DOMAIN: envVars.LOGTO_API_DOMAIN!,
    LOGTO_APP_ID: envVars.LOGTO_APP_ID!,
    LOGTO_APP_SECRET: envVars.LOGTO_APP_SECRET!,
    LOGTO_RESOURCE_INDICATOR: envVars.LOGTO_RESOURCE_INDICATOR!,
    LOGTO_M2M_APP_ID: envVars.LOGTO_M2M_APP_ID!,
    LOGTO_MACHINE_APP_SECRET: envVars.LOGTO_MACHINE_APP_SECRET!,

    SMYTH_PROXY: envVars.SMYTH_PROXY!,
    SMYTH_AGENT_RUNTIME_API: envVars.SMYTH_AGENT_RUNTIME_API!,

    AWS_ACCESS_KEY_ID: envVars.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: envVars.AWS_SECRET_ACCESS_KEY,
    AWS_SES_SENDING_EMAIL: envVars.AWS_SES_SENDING_EMAIL,
    AWS_SES_ARN: envVars.AWS_SES_ARN,
    AWS_REGION: envVars.AWS_REGION,
    FRONTEND_BASE_URL: envVars.FRONTEND_BASE_URL,

    REDIS_CLUSTER_SENTINELS: envVars.REDIS_CLUSTER_SENTINELS,
    REDIS_CLUSTER_MASTER_NAME: envVars.REDIS_CLUSTER_MASTER_NAME,
    REDIS_CLUSTER_PASSWORD: envVars.REDIS_CLUSTER_PASSWORD,

    SMYTH_API_KEY: envVars.SMYTH_API_KEY,
    DOMAIN_REGISTERATION_TARGET: envVars.DOMAIN_REGISTERATION_TARGET,

    DATABASE_URL_READONLY_USER: envVars.DATABASE_URL_READONLY_USER,
    DATABASE_URL: process.env.DATABASE_URL!,
    LOGS_DATABASE_URL: process.env.LOGS_DATABASE_URL!,

    PUSHGATEWAY_URL: envVars.PUSHGATEWAY_URL,
  },

  package: {
    name,
    version,
  },
};
