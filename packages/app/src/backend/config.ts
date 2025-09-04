import crypto from 'crypto';
import dotenv from 'dotenv';
import Joi from 'joi';
import os from 'os';
import path from 'path';

dotenv.config();

const getDefaultDataPath = () => {
  const homeDir = os.homedir();
  return path.join(homeDir, 'smyth-ui-data');
};

const config = {
  env: {
    // MANDATORY KEYS
    PORT: +process.env.PORT, // + is for casting to number
    ADMIN_PORT: +process.env.ADMIN_PORT,
    NODE_ENV: process.env.NODE_ENV,
    LOCAL_MODE: process.env.LOCAL_MODE,

    API_SERVER: process.env.API_SERVER,
    PUB_API_SERVER: process.env.PUB_API_SERVER,

    UI_SERVER: process.env.UI_SERVER || `http://localhost:${process.env.PORT}`,
    DATA_PATH: process.env.DATA_PATH || getDefaultDataPath(),
    SMYTH_API_BASE_URL: process.env.SMYTH_API_SERVER,
    DOC_SERVER: process.env.DOC_SERVER, // to be removed once all links are migrated to new Docs

    LOGTO_SERVER: process.env.LOGTO_SERVER,
    LOGTO_APP_ID: process.env.LOGTO_APP_ID,
    LOGTO_APP_SECRET: process.env.LOGTO_APP_SECRET,
    LOGTO_API_RESOURCE: process.env.LOGTO_API_RESOURCE,
    LOGTO_M2M_APP_ID: process.env.LOGTO_M2M_APP_ID,
    LOGTO_M2M_APP_SECRET: process.env.LOGTO_M2M_APP_SECRET,

    OPENAI_API_KEY: process.env.OPENAI_API_KEY, // used for some autocompletion
    FALAI_API_KEY: process.env.FALAI_API_KEY, // used for image gen

    SMYTH_VAULT_API_BASE_URL: process.env.SMYTH_VAULT_API_BASE_URL, // we need a local JSON vault solution that can be working with CE SRE

    // OPTIONAL KEYS
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
    MAINTENANCE: process.env.MAINTENANCE || 'OFF',

    SMYTH_STAFF_EMAILS: process.env.SMYTH_STAFF_EMAILS || '',
    SMYTH_ALPHA_EMAILS: process.env.SMYTH_ALPHA_EMAILS || '',

    PROD_AGENT_DOMAIN: process.env.PROD_AGENT_DOMAIN || 'agent.pstage.smyth.ai',

    SMYTH_AGENT_BUILDER_BASE_URL: process.env.SMYTH_AGENT_BUILDER_BASE_URL, // to be removed and placed in EE

    // COMPONENT SPECIFIC KEYS
    AWS_LAMBDA_REGION: process.env.AWS_LAMBDA_REGION,
    AWS_LAMBDA_ACCESS_KEY_ID: process.env.AWS_LAMBDA_ACCESS_KEY_ID,
    AWS_LAMBDA_SECRET_ACCESS_KEY: process.env.AWS_LAMBDA_SECRET_ACCESS_KEY,

    // NEEDS TO BE REMOVED SINCE IT IS USED BY A NON-USED COMPONENT
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  },
  api: {
    SMYTH_USER_API_URL: `${process.env.SMYTH_API_SERVER}/v1`,
    SMYTH_M2M_API_URL: `${process.env.SMYTH_API_SERVER}/_sysapi/v1`,
  },

  flags: {
    useRedis: Boolean(process.env.REDIS_SENTINEL_HOSTS),
  },

  cache: {
    STANDARD_MODELS_CACHE_KEY: `__llm_smod_cache_${_generateHash(process.env.UI_SERVER)}`,
    getCustomModelsCacheKey: (teamId: string) => `__llm_cmod_cache_${teamId}`,
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

const requiredKeysSchema = Joi.object({
  // PORT: Joi.number().default(3000),
  // ADMIN_PORT: Joi.number().default(3001),
  NODE_ENV: Joi.string().valid('PROD', 'DEV', 'TEST').required().default('DEV'),
  // LOCAL_MODE: Joi.boolean().default(false),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  API_SERVER: Joi.string().required(),
  DOC_SERVER: Joi.string().required(),
  SMYTH_API_BASE_URL: Joi.string().required(),
  // LOGTO_SERVER: Joi.string().required(),
  // LOGTO_APP_ID: Joi.string().required(),
  // LOGTO_APP_SECRET: Joi.string().required(),
  // LOGTO_API_RESOURCE: Joi.string().required(),
  // OPENAI_API_KEY: Joi.string().required(),

  // AWS_ACCESS_KEY_ID: Joi.string().required(),
  // AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  // AWS_S3_BUCKET_NAME: Joi.string().required(),
  // AWS_S3_REGION: Joi.string().required(),
  // AWS_S3_PUB_BUCKET_NAME: Joi.string().required(),
  // AWS_S3_PUB_REGION: Joi.string().required(),
}).unknown(true);

const { error, value } = requiredKeysSchema.validate(config.env);

if (error) {
  console.warn('config validation error: ', error.message);
}

function _generateHash(str, algorithm = 'md5') {
  const hash = crypto.createHash(algorithm);
  hash.update(str);
  return hash.digest('hex');
}

export default config;
