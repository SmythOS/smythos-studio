/* eslint-disable @typescript-eslint/no-non-null-assertion */
import dotenvFlow from 'dotenv-flow';
import os from 'os';
import path from 'path';
import { name, version } from '../package.json';
import { getDirname } from '../src/utils/general';

dotenvFlow.config({
  files: ['../../.env', '../.env'],
});

// const rootPath = require.main?.path;
const rootPath = path.join(getDirname(), '..');

if (!rootPath) {
  process.exit(1);
}

const getDefaultDataPath = () => {
  const homeDir = os.homedir();
  return path.join(homeDir, 'smythos-data');
};

const dataPath = process.env.DATA_PATH || getDefaultDataPath();

// Default to SQLite if no DATABASE_URL is provided (not working yet)

export const config = {
  variables: {
    env: process.env.NODE_ENV,
    port: process.env.MIDDLEWARE_API_PORT,

    DATABASE_URL: process.env.DATABASE_URL,
    VAULT_FILE_PATH: path.join(dataPath, 'vault.json'),
  },

  package: {
    name,
    version,
  },
};
