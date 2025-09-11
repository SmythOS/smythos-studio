/* eslint-disable vars-on-top */
/* eslint-disable no-var */
import { PrismaClient } from '@prisma/client';

// declare global {
//   var prisma: PrismaClient; // Use 'var' to declare a global variable
// }

// add prisma to the NodeJS global type
//! downgrade @types/node to 15.14.1 to avoid error on NodeJS.Global
// interface CustomNodeJsGlobal extends NodeJS.Global {
//   prisma: PrismaClient;
// }

// Prevent multiple instances of Prisma Client in development

// main app prisma instance
const prisma = (global.prisma as PrismaClient) || new PrismaClient();

//* disabled for now becuse it breaks some of the current code
// TODO: enable this as soon as we have some time to fix the code
// prisma.$use(async (params, next) => { // middleware for ensuring that no "undefined" values are passed to prisma
//   if (hasUndefinedValue(params.args?.where)) throw new Error(`Invalid where: ${JSON.stringify(params.args.where)}`);
//   return next(params);
// });

// function hasUndefinedValue<T>(obj: T): boolean {
//   if (typeof obj !== 'object' || obj === null) return false;

//   for (const [key, value] of Object.entries(obj)) {
//     if (value === undefined) return true;

//     if (typeof value === 'object' && !Array.isArray(value)) {
//       if (hasUndefinedValue(value)) return true;
//     }
//   }

//   return false;
// }

if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

export { prisma };
