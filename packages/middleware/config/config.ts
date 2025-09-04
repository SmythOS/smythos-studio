/* eslint-disable @typescript-eslint/no-non-null-assertion */
import path from 'path';
import { name, version } from '../package.json';
import { getDirname } from '../src/utils/general';

// const rootPath = require.main?.path;
const rootPath = path.join(getDirname(), '..');
if (!rootPath) {
  process.exit(1);
}

// Default to SQLite if no DATABASE_URL is provided (not working yet)
// dotenv.config({ path: path.join(getDirname(), '../.env') });
// const defaultSqliteUrl = `file:${path.join(rootPath, 'data', 'dev.db')}`;

export const config = {
  variables: {
    env: process.env.NODE_ENV,
    port: Number(process.env.PORT),

    DATABASE_URL: process.env.DATABASE_URL,
  },

  package: {
    name,
    version,
  },
};
