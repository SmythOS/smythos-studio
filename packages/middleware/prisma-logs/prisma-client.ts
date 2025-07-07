/* eslint-disable vars-on-top */
/* eslint-disable no-var */
import { PrismaClient } from '@~internal/prisma-logs/client/index.js';

// add prisma to the NodeJS global type
//! downgrade @types/node to 15.14.1 to avoid error on NodeJS.Global
// declare global {
//   var prismaLogsDb: PrismaClient; // Use 'var' to declare a global variable
// }

// Prevent multiple instances of Prisma Client in development

// main app prisma instance
const prismaLogsDb = (global.prismaLogsDb as PrismaClient) || new PrismaClient();

if (process.env.NODE_ENV === 'development') {
  global.prismaLogsDb = prismaLogsDb;
}

export { prismaLogsDb };
