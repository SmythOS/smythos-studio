/* eslint-disable @typescript-eslint/no-non-null-assertion */
import dotenv from 'dotenv';
import path from 'path';
import { name, version } from '../package.json';
import { getDirname } from '../src/utils/general';

// const rootPath = require.main?.path;
const rootPath = path.join(getDirname(), '..');
if (!rootPath) {
  process.exit(1);
}
dotenv.config({ path: path.join(getDirname(), '../.env') });

// Default to SQLite if no DATABASE_URL is provided
const defaultSqliteUrl = `file:${path.join(rootPath, 'data', 'dev.db')}`;

export const config = {
  variables: {
    env: process.env.NODE_ENV,
    port: Number(process.env.PORT),

    LOGTO_API_DOMAIN: process.env.LOGTO_API_DOMAIN!,
    LOGTO_APP_ID: process.env.LOGTO_APP_ID!,
    LOGTO_APP_SECRET: process.env.LOGTO_APP_SECRET!,
    LOGTO_RESOURCE_INDICATOR: process.env.LOGTO_RESOURCE_INDICATOR!,
    LOGTO_M2M_APP_ID: process.env.LOGTO_M2M_APP_ID!,
    LOGTO_MACHINE_APP_SECRET: process.env.LOGTO_MACHINE_APP_SECRET!,
    DATABASE_URL: process.env.DATABASE_URL || defaultSqliteUrl,
  },

  package: {
    name,
    version,
  },
};
