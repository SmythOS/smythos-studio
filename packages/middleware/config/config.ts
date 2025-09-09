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
  return path.join(homeDir, 'smyth-ui-data');
};

// Default to SQLite if no DATABASE_URL is provided (not working yet)
// dotenv.config({ path: path.join(getDirname(), '../.env') });
// const defaultSqliteUrl = `file:${path.join(rootPath, 'data', 'dev.db')}`;

export const config = {
  variables: {
    env: process.env.NODE_ENV,
    port: process.env.MIDDLEWARE_API_PORT,

    DATABASE_URL: process.env.DATABASE_URL,
    VAULT_FILE_PATH: path.join(getDefaultDataPath(), 'vault.json'),
  },

  package: {
    name,
    version,
  },
};
