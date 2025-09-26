/* eslint-disable @typescript-eslint/no-non-null-assertion */
import expandEnv from 'dotenv-expand';
import dotenvFlow from 'dotenv-flow';
import os from 'os';
import path from 'path';
import { name, version } from '../package.json';
import { getDirname } from '../src/utils/general';

expandEnv.expand(
  dotenvFlow.config({
    files: ['../../.env', '../.env'],
  }),
);

// const rootPath = require.main?.path;
const rootPath = path.join(getDirname(), '..');

if (!rootPath) {
  process.exit(1);
}

const getLocalStoragePath = () => {
  const homeDir = os.homedir();
  return path.join(homeDir, 'smythos-data');
};

const LOCAL_STORAGE_PATH = getLocalStoragePath();

// Default to SQLite if no DATABASE_URL is provided (not working yet)

export const config = {
  variables: {
    env: process.env.NODE_ENV,
    port: process.env.MIDDLEWARE_API_PORT,

    DATABASE_PROVIDER: process.env.DATABASE_PROVIDER,
    DATABASE_HOST: process.env.DATABASE_HOST,
    DATABASE_USER: process.env.DATABASE_USER,
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
    DATABASE_NAME: process.env.DATABASE_NAME,
    DATABASE_URL: process.env.DATABASE_URL,
    LOCAL_STORAGE_PATH,
    SRE_STORAGE_PATH: path.join(LOCAL_STORAGE_PATH, '.smyth'),
  },

  package: {
    name,
    version,
  },
};
