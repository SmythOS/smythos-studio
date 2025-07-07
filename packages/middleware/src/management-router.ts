import express from 'express';
import { config } from '../config/config';
import { app } from './app';
import { Server } from 'http';
import { LOGGER } from '../config/logging';

const ADMIN_PORT = config.variables.ADMIN_PORT;
const PORT = config.variables.port;
// eslint-disable-next-line import/no-mutable-exports
export let server: Server;

function enableAppPort() {
  server = app.listen(PORT, 'localhost', () => {
    LOGGER.info(`App Server listening on localhost:${PORT}`);
  });

  return server;
}

// Function to disable port 5000 to stop accepting new connections
function disableAppPort() {
  server.close(() => {
    LOGGER.info(`App Server listening on port ${PORT} no longer accepting connections`);
  });
}

// Management app listening on port 8080
export const managementApp = express();

// Route to handle management operations
managementApp.get('/', (req, res) => {
  res.send('Management operations.');
});

// Route to enable port 5000 for new connections
managementApp.get('/enable', (req, res) => {
  enableAppPort();
  res.send(`Port ${PORT} enabled for new connections via management port.`);
});

// Route to disable port 5000 for new connections
managementApp.get('/disable', (req, res) => {
  disableAppPort();
  res.send(`Port ${PORT} disabled for new connections via management port.`);
});

export function startServers() {
  managementApp.listen(ADMIN_PORT, 'localhost', () => {
    LOGGER.info(`Management server listening on port ${ADMIN_PORT}`);
  });

  const appServer = enableAppPort();
  return appServer;
}
