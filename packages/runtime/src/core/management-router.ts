import express from "express";
import { app } from "../index.js";
import { Server } from "http";
import config from "./config";

const ADMIN_PORT = config.env.ADMIN_PORT || 5054;
const PORT = config.env.PORT || 5053;
// eslint-disable-next-line import/no-mutable-exports

export let server: Server;

const host = config.env.NODE_ENV === "production" ? "localhost" : "";

function enableAppPort() {
  if (server && server.listening) {
    console.info(`Server is already running at http://localhost:${PORT}`);
    return server;
  }

  server = app.listen(PORT, host, () => {
    console.info(`Server is running at http://localhost:${PORT}`);
  });

  return server;
}

// Function to disable port 5000 to stop accepting new connections
function disableAppPort() {
  server.close(() => {
    console.info(
      `App Server listening on port ${PORT} no longer accepting connections`
    );
  });
}

// Management app listening on port 5054
const managementApp = express();
export { managementApp };

// Route to handle management operations
managementApp.get("/", (req, res) => {
  res.send("Management operations.");
});

// Route to enable port 5000 for new connections
managementApp.get("/enable", (req, res) => {
  enableAppPort();
  res.send(`Port ${PORT} enabled for new connections via management port.`);
});

// Route to disable port 5000 for new connections
managementApp.get("/disable", (req, res) => {
  disableAppPort();
  res.send(`Port ${PORT} disabled for new connections via management port.`);
});

managementApp.get("/stats", (req, res) => {
  server.getConnections((err, count) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json({ connections: count });
    }
  });
});

// managementApp.get('/metrics', async (req, res) => {
//   LOGGER.info('FLUSHING METRICS TO PROMETHEUS');
//   res.set('Content-Type', metricsManager.metricesRegister.contentType);
//   res.end(await metricsManager.metricesRegister.metrics());
// });

export function startServers() {
  managementApp.listen(ADMIN_PORT, host, () => {
    console.info(`Management server listening on port ${ADMIN_PORT}`);
  });

  const appServer = enableAppPort();
  return appServer;
}
