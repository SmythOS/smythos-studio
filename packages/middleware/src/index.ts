import { Server } from 'http';
import { LOGGER } from '../config/logging';
import { prisma } from '../prisma/prisma-client';
import { appEvents } from './utils/app-events';
import ensureDataDir from './scripts/ensure-data-dir';
import { app } from './app';
import { config } from '../config/config';

let server: Server | null = null;
(async () => {
  try {
    // Ensure data directory exists for SQLite
    ensureDataDir();

    // establish connection to database
    await prisma.$connect();
    LOGGER.info('Connected to database');

    server = app.listen(config.variables.port, () => {
      LOGGER.info(`Listening to port ${config.variables.port}`);
      appEvents.emit('STARTUP', undefined); // emit startup event
    });
  } catch (error) {
    LOGGER.error(error);
  }
})();

const exitHandler = async () => {
  if (server) {
    appEvents.emit('SHUTDOWN', undefined); // emit shutdown event
    server.close(() => {
      LOGGER.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: Error) => {
  LOGGER.error(error);
  exitHandler();
};

process.on('uncaughtException', err => LOGGER.error(err));
process.on('unhandledRejection', err => LOGGER.error(err));
process.on('SIGTERM', () => {
  LOGGER.info('SIGTERM received');
  if (server) {
    server.close();
  }
});

setInterval(() => {
  const memoryUsage = process.memoryUsage();

  LOGGER.info(`Memory Usage at ${new Date().toLocaleTimeString()}:`);
  LOGGER.info(`  RSS: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`);
  LOGGER.info(`  Heap Total: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  LOGGER.info(`  Heap Used: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  LOGGER.info(`  External: ${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`);
  LOGGER.info('--------------------------------------------');
}, 60_000); // Outputs every 5 seconds
