import express from 'express';
import { Server } from 'http';

export function createAdminServer(mainApp: Server, mainAppPort: number, adminPort: number) {
  const adminApp = express();

  adminApp.get('/enable', (req, res) => {
    if (!mainApp.listening) {
      mainApp.listen(mainAppPort, 'localhost', () => {
        console.log(`Main server re-enabled and listening on port ${mainAppPort}`);
      });
      res.send(`Main server enabled and listening on port ${mainAppPort}`);
    } else {
      res.send('Main server is already running');
    }
  });

  adminApp.get('/disable', (req, res) => {
    if (mainApp.listening) {
      mainApp.close(() => {
        console.log(`Main server disabled and no longer accepting connections`);
      });
      res.send(`Main server disabled and no longer accepting connections`);
    } else {
      res.send('Main server is already stopped');
    }
  });

  adminApp.listen(adminPort, 'localhost', () => {
    console.log(`Admin server listening on port ${adminPort}`);
  });

  return adminApp;
}
