import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const config = {
  env: {
    PORT: +process.env.PORT, // + is for casting to number
    ADMIN_PORT: +process.env.ADMIN_PORT,
    NODE_ENV: process.env.NODE_ENV,
    LOCAL_MODE: process.env.LOCAL_MODE,
    LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
    LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
    TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    API_SERVER: process.env.API_SERVER,
    PUB_API_SERVER: process.env.PUB_API_SERVER,
    UI_SERVER: process.env.UI_SERVER,
    DOC_SERVER: process.env.DOC_SERVER,
    DATA_PATH: process.env.DATA_PATH,
    SMYTH_API_BASE_URL: process.env.SMYTH_API_SERVER,
    LOGTO_SERVER: process.env.LOGTO_SERVER,
    LOGTO_APP_ID: process.env.LOGTO_APP_ID,
    LOGTO_APP_SECRET: process.env.LOGTO_APP_SECRET,
    LOGTO_API_RESOURCE: process.env.LOGTO_API_RESOURCE,
    LOGTO_M2M_APP_ID: process.env.LOGTO_M2M_APP_ID,
    LOGTO_M2M_APP_SECRET: process.env.LOGTO_M2M_APP_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    FALAI_API_KEY: process.env.FALAI_API_KEY,
    REDIS_SENTINEL_HOSTS: process.env.REDIS_SENTINEL_HOSTS,
    REDIS_MASTER_NAME: process.env.REDIS_MASTER_NAME,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,

    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
    AWS_S3_PUB_BUCKET_NAME: process.env.AWS_S3_PUB_BUCKET_NAME,
    AWS_S3_REGION: process.env.AWS_S3_REGION,
    AWS_S3_PUB_REGION: process.env.AWS_S3_PUB_REGION,
    SESSION_SECRET: process.env.SESSION_SECRET,
    MAINTENANCE: process.env.MAINTENANCE,

    GRAFANA_URL: process.env.GRAFANA_URL,
    GRAFANA_TOKEN: process.env.GRAFANA_TOKEN,
    GRAFANA_USER: process.env.GRAFANA_USER,
    GRAFANA_PASSWORD: process.env.GRAFANA_PASSWORD,

    SMYTH_STAFF_EMAILS: process.env.SMYTH_STAFF_EMAILS || '',
    SMYTH_ALPHA_EMAILS: process.env.SMYTH_ALPHA_EMAILS || '',

    FIRST_PROMOTER_API_KEY: process.env.FIRST_PROMOTER_API_KEY,
    PROD_AGENT_DOMAIN: process.env.PROD_AGENT_DOMAIN,

    SMYTH_VAULT_API_BASE_URL: process.env.SMYTH_VAULT_API_BASE_URL,
    SMYTH_AGENT_BUILDER_BASE_URL: process.env.SMYTH_AGENT_BUILDER_BASE_URL,
    // POSTHOG_API_KEY: process.env.REACT_APP_PUBLIC_POSTHOG_KEY,
    // POSTHOG_HOST: process.env.REACT_APP_PUBLIC_POSTHOG_HOST,

    AWS_LAMBDA_REGION: process.env.AWS_LAMBDA_REGION,
    AWS_LAMBDA_ACCESS_KEY_ID: process.env.AWS_LAMBDA_ACCESS_KEY_ID,
    AWS_LAMBDA_SECRET_ACCESS_KEY: process.env.AWS_LAMBDA_SECRET_ACCESS_KEY,
  },
  api: {
    SMYTH_USER_API_URL: `${process.env.SMYTH_API_SERVER}/v1`,
    SMYTH_M2M_API_URL: `${process.env.SMYTH_API_SERVER}/_sysapi/v1`,
  },
};

export const supportedHfTasks = [
  'text-classification',
  'token-classification',
  'table-question-answering',
  'question-answering',
  'document-question-answering',
  'visual-question-answering',
  'zero-shot-classification',
  'translation',
  'summarization',
  'conversational',
  'text-generation',
  'text2text-generation',
  'fill-mask',
  'sentence-similarity',
  'text-to-image',
  'image-to-text',
  'image-to-image',
  'text-to-speech',
  'automatic-speech-recognition',
  'feature-extraction',
  'audio-to-audio',
  'audio-classification',
  'zero-shot-image-classification',
  'image-classification',
  'object-detection',
  'image-segmentation',
];

const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  ADMIN_PORT: Joi.number().default(3001),
  NODE_ENV: Joi.string().valid('PROD', 'DEV', 'TEST').required().default('DEV'),
  LOCAL_MODE: Joi.boolean().default(false),
  LINKEDIN_CLIENT_ID: Joi.string().required(),
  LINKEDIN_CLIENT_SECRET: Joi.string().required(),
  TWITTER_CLIENT_ID: Joi.string().required(),
  TWITTER_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  API_SERVER: Joi.string().required(),
  UI_SERVER: Joi.string().required(),
  DOC_SERVER: Joi.string().required(),
  DATA_PATH: Joi.string().required(),
  SMYTH_API_BASE_URL: Joi.string().required(),
  LOGTO_SERVER: Joi.string().required(),
  LOGTO_APP_ID: Joi.string().required(),
  LOGTO_APP_SECRET: Joi.string().required(),
  LOGTO_API_RESOURCE: Joi.string().required(),
  OPENAI_API_KEY: Joi.string().required(),
  SESSION_SECRET: Joi.string().required(),

  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_S3_BUCKET_NAME: Joi.string().required(),
  AWS_S3_REGION: Joi.string().required(),
  AWS_S3_PUB_BUCKET_NAME: Joi.string().required(),
  AWS_S3_PUB_REGION: Joi.string().required(),

  PROD_AGENT_DOMAIN: Joi.string().required(),

  // POSTHOG_API_KEY: Joi.string().required(),
  // POSTHOG_HOST: Joi.string().required(),
});

const { error, value } = validationSchema.validate(config.env);

if (error) {
  console.warn('Config validation error: ', error.message);
}

export default config;
